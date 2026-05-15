import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../common/app-config/app-config.service';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  AnalyticsWindow,
  BoostAnalyticsRow,
  BoostsAnalyticsDto,
  DailyPoint,
  DayOfWeekBucket,
  HourBucket,
  PerformanceAnalyticsDto,
  SpendAnalyticsDto,
  SpendBucket,
  VenuesAnalyticsDto,
} from './analytics.serializer';

const DAY_MS = 86_400_000;

interface DailyRow {
  day: Date;
  picks: bigint;
  confirmed: bigint;
  spendCents: bigint;
}

interface HourRow {
  hour: number;
  picks: bigint;
  confirmed: bigint;
}

interface DowRow {
  dow: number;
  picks: bigint;
  confirmed: bigint;
}

interface PerformanceTotalsRow {
  picks: bigint;
  confirmed: bigint;
  spendCents: bigint;
}

interface VenueRow {
  id: string;
  placeName: string;
  isPaused: boolean;
  createdAt: Date;
  picks: bigint;
  confirmed: bigint;
  spendCents: bigint;
  lastPickAt: Date | null;
}

interface BoostPicksRow {
  boostId: string;
  picks: bigint;
  confirmed: bigint;
  pickRevenueCents: bigint;
}

interface SpendPickRow {
  bucket: Date;
  spendCents: bigint;
}

interface SpendBoostRow {
  bucket: Date;
  spendCents: bigint;
}

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function resolveWindow(
  from: string | undefined,
  to: string | undefined,
  defaultWindowDays: number,
): AnalyticsWindow {
  const today = startOfUtcDay(new Date());
  const toDate = to ? startOfUtcDay(new Date(to)) : today;
  const fromDate = from
    ? startOfUtcDay(new Date(from))
    : new Date(toDate.getTime() - (defaultWindowDays - 1) * DAY_MS);
  const days = Math.round((toDate.getTime() - fromDate.getTime()) / DAY_MS) + 1;
  return { from: toYmd(fromDate), to: toYmd(toDate), days };
}

function windowBounds(w: AnalyticsWindow): {
  start: Date;
  endExclusive: Date;
  priorStart: Date;
} {
  const start = new Date(`${w.from}T00:00:00.000Z`);
  const endExclusive = new Date(
    new Date(`${w.to}T00:00:00.000Z`).getTime() + DAY_MS,
  );
  const priorStart = new Date(start.getTime() - w.days * DAY_MS);
  return { start, endExclusive, priorStart };
}

function fillDaily(rows: DailyRow[], w: AnalyticsWindow): DailyPoint[] {
  const start = new Date(`${w.from}T00:00:00.000Z`);
  const byDay = new Map<string, DailyRow>();
  for (const r of rows) byDay.set(toYmd(startOfUtcDay(r.day)), r);
  const out: DailyPoint[] = [];
  for (let i = 0; i < w.days; i++) {
    const d = new Date(start.getTime() + i * DAY_MS);
    const key = toYmd(d);
    const row = byDay.get(key);
    out.push({
      date: key,
      picks: Number(row?.picks ?? 0),
      confirmed: Number(row?.confirmed ?? 0),
      spendCents: Number(row?.spendCents ?? 0),
    });
  }
  return out;
}

function fillHourly(rows: HourRow[]): HourBucket[] {
  const map = new Map(rows.map((r) => [Number(r.hour), r]));
  const out: HourBucket[] = [];
  for (let h = 0; h < 24; h++) {
    const r = map.get(h);
    out.push({
      hour: h,
      picks: Number(r?.picks ?? 0),
      confirmed: Number(r?.confirmed ?? 0),
    });
  }
  return out;
}

function fillDow(rows: DowRow[]): DayOfWeekBucket[] {
  const map = new Map(rows.map((r) => [Number(r.dow), r]));
  const out: DayOfWeekBucket[] = [];
  for (let d = 0; d < 7; d++) {
    const r = map.get(d);
    out.push({
      dayOfWeek: d,
      picks: Number(r?.picks ?? 0),
      confirmed: Number(r?.confirmed ?? 0),
    });
  }
  return out;
}

function pickGranularity(days: number): 'day' | 'week' | 'month' {
  if (days <= 45) return 'day';
  if (days <= 180) return 'week';
  return 'month';
}

function bucketLabel(d: Date, gran: 'day' | 'week' | 'month'): string {
  return gran === 'month' ? d.toISOString().slice(0, 7) : toYmd(d);
}

function boostState(
  startsAt: Date,
  endsAt: Date,
  cancelledAt: Date | null,
  now: Date,
): BoostAnalyticsRow['state'] {
  if (cancelledAt) return 'cancelled';
  if (startsAt > now) return 'scheduled';
  if (endsAt <= now) return 'ended';
  return 'live';
}

@Injectable()
export class BusinessAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
  ) {}

  private async resolveWindow(
    from?: string,
    to?: string,
  ): Promise<AnalyticsWindow> {
    const defaultWindowDays = await this.appConfig.getInt(
      'analytics.business_window_days',
    );
    return resolveWindow(from, to, defaultWindowDays);
  }

  async getPerformance(
    businessId: string,
    from?: string,
    to?: string,
  ): Promise<PerformanceAnalyticsDto> {
    const window = await this.resolveWindow(from, to);
    const { start, endExclusive, priorStart } = windowBounds(window);

    const [currTotalsRows, priorTotalsRows, dailyRows, hourlyRows, dowRows] =
      await Promise.all([
        this.prisma.$queryRaw<PerformanceTotalsRow[]>`
        SELECT
          COUNT(*) FILTER (WHERE vse.kind = 'PICK')      AS picks,
          COUNT(*) FILTER (WHERE vse.kind = 'CONFIRMED') AS confirmed,
          COALESCE(SUM(vse."chargedCents") FILTER (WHERE vse.kind = 'CONFIRMED'), 0) AS "spendCents"
        FROM "VenueSuggestionEvent" vse
        JOIN "BusinessVenue" v ON v.id = vse."venueId"
        WHERE v."businessId" = ${businessId}
          AND vse."createdAt" >= ${start}
          AND vse."createdAt" < ${endExclusive}
      `,
        this.prisma.$queryRaw<PerformanceTotalsRow[]>`
        SELECT
          COUNT(*) FILTER (WHERE vse.kind = 'PICK')      AS picks,
          COUNT(*) FILTER (WHERE vse.kind = 'CONFIRMED') AS confirmed,
          COALESCE(SUM(vse."chargedCents") FILTER (WHERE vse.kind = 'CONFIRMED'), 0) AS "spendCents"
        FROM "VenueSuggestionEvent" vse
        JOIN "BusinessVenue" v ON v.id = vse."venueId"
        WHERE v."businessId" = ${businessId}
          AND vse."createdAt" >= ${priorStart}
          AND vse."createdAt" < ${start}
      `,
        this.prisma.$queryRaw<DailyRow[]>`
        SELECT
          date_trunc('day', vse."createdAt") AS day,
          COUNT(*) FILTER (WHERE vse.kind = 'PICK')      AS picks,
          COUNT(*) FILTER (WHERE vse.kind = 'CONFIRMED') AS confirmed,
          COALESCE(SUM(vse."chargedCents") FILTER (WHERE vse.kind = 'CONFIRMED'), 0) AS "spendCents"
        FROM "VenueSuggestionEvent" vse
        JOIN "BusinessVenue" v ON v.id = vse."venueId"
        WHERE v."businessId" = ${businessId}
          AND vse."createdAt" >= ${start}
          AND vse."createdAt" < ${endExclusive}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
        this.prisma.$queryRaw<HourRow[]>`
        SELECT
          EXTRACT(HOUR FROM vse."createdAt")::int AS hour,
          COUNT(*) FILTER (WHERE vse.kind = 'PICK')      AS picks,
          COUNT(*) FILTER (WHERE vse.kind = 'CONFIRMED') AS confirmed
        FROM "VenueSuggestionEvent" vse
        JOIN "BusinessVenue" v ON v.id = vse."venueId"
        WHERE v."businessId" = ${businessId}
          AND vse."createdAt" >= ${start}
          AND vse."createdAt" < ${endExclusive}
        GROUP BY 1
      `,
        this.prisma.$queryRaw<DowRow[]>`
        SELECT
          EXTRACT(DOW FROM vse."createdAt")::int AS dow,
          COUNT(*) FILTER (WHERE vse.kind = 'PICK')      AS picks,
          COUNT(*) FILTER (WHERE vse.kind = 'CONFIRMED') AS confirmed
        FROM "VenueSuggestionEvent" vse
        JOIN "BusinessVenue" v ON v.id = vse."venueId"
        WHERE v."businessId" = ${businessId}
          AND vse."createdAt" >= ${start}
          AND vse."createdAt" < ${endExclusive}
        GROUP BY 1
      `,
      ]);

    const curr = currTotalsRows[0];
    const prior = priorTotalsRows[0];
    const picks = Number(curr.picks);
    const confirmed = Number(curr.confirmed);
    const conversionPct =
      picks > 0 ? Math.round((confirmed / picks) * 1000) / 10 : null;

    return {
      window,
      totals: {
        picks,
        confirmed,
        spendCents: Number(curr.spendCents),
        conversionPct,
        picksPrior: Number(prior.picks),
        confirmedPrior: Number(prior.confirmed),
        spendCentsPrior: Number(prior.spendCents),
      },
      daily: fillDaily(dailyRows, window),
      hourly: fillHourly(hourlyRows),
      dayOfWeek: fillDow(dowRows),
    };
  }

  async getVenues(
    businessId: string,
    from?: string,
    to?: string,
  ): Promise<VenuesAnalyticsDto> {
    const window = await this.resolveWindow(from, to);
    const { start, endExclusive } = windowBounds(window);
    const dormantThresholdDays = await this.appConfig.getInt(
      'analytics.dormant_threshold_days',
    );
    const dormantCutoff = new Date(Date.now() - dormantThresholdDays * DAY_MS);

    const rows = await this.prisma.$queryRaw<VenueRow[]>`
      SELECT
        v.id,
        v."placeName",
        v."isPaused",
        v."createdAt",
        COALESCE(COUNT(*) FILTER (WHERE vse.kind = 'PICK'), 0)      AS picks,
        COALESCE(COUNT(*) FILTER (WHERE vse.kind = 'CONFIRMED'), 0) AS confirmed,
        COALESCE(SUM(vse."chargedCents") FILTER (WHERE vse.kind = 'CONFIRMED'), 0) AS "spendCents",
        MAX(vse."createdAt") FILTER (WHERE vse.kind IN ('PICK', 'CONFIRMED')) AS "lastPickAt"
      FROM "BusinessVenue" v
      LEFT JOIN "VenueSuggestionEvent" vse
        ON vse."venueId" = v.id
       AND vse."createdAt" >= ${start}
       AND vse."createdAt" < ${endExclusive}
      WHERE v."businessId" = ${businessId}
      GROUP BY v.id, v."placeName", v."isPaused", v."createdAt"
      ORDER BY confirmed DESC, picks DESC, v."placeName" ASC
    `;

    const dormantRows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT v.id
      FROM "BusinessVenue" v
      LEFT JOIN (
        SELECT "venueId", MAX("createdAt") AS "lastAt"
        FROM "VenueSuggestionEvent"
        WHERE kind IN ('PICK', 'CONFIRMED')
        GROUP BY "venueId"
      ) recent ON recent."venueId" = v.id
      WHERE v."businessId" = ${businessId}
        AND v."isPaused" = false
        AND (recent."lastAt" IS NULL OR recent."lastAt" < ${dormantCutoff})
    `;

    return {
      window,
      venues: rows.map((r) => {
        const picks = Number(r.picks);
        const confirmed = Number(r.confirmed);
        return {
          id: r.id,
          placeName: r.placeName,
          isPaused: r.isPaused,
          createdAt: r.createdAt.toISOString(),
          picks,
          confirmed,
          spendCents: Number(r.spendCents),
          conversionPct:
            picks > 0 ? Math.round((confirmed / picks) * 1000) / 10 : null,
          lastPickAt: r.lastPickAt ? r.lastPickAt.toISOString() : null,
        };
      }),
      dormantVenueIds: dormantRows.map((r) => r.id),
    };
  }

  async getBoosts(
    businessId: string,
    from?: string,
    to?: string,
  ): Promise<BoostsAnalyticsDto> {
    const window = await this.resolveWindow(from, to);
    const { start, endExclusive } = windowBounds(window);
    const now = new Date();

    const boosts = await this.prisma.activityBoost.findMany({
      where: {
        businessId,
        createdAt: { gte: start, lt: endExclusive },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        activity: { select: { id: true, emoji: true, title: true } },
      },
    });

    let perBoost: BoostPicksRow[] = [];
    if (boosts.length > 0) {
      const ids = boosts.map((b) => b.id);
      perBoost = await this.prisma.$queryRaw<BoostPicksRow[]>`
        SELECT
          b.id AS "boostId",
          COALESCE(COUNT(*) FILTER (WHERE vse.kind = 'PICK'), 0)      AS picks,
          COALESCE(COUNT(*) FILTER (WHERE vse.kind = 'CONFIRMED'), 0) AS confirmed,
          COALESCE(SUM(vse."chargedCents") FILTER (WHERE vse.kind = 'CONFIRMED'), 0) AS "pickRevenueCents"
        FROM "ActivityBoost" b
        LEFT JOIN "VenueSuggestionEvent" vse
          ON vse."activityId" = b."activityId"
         AND vse."createdAt" >= b."startsAt"
         AND vse."createdAt" < b."endsAt"
        WHERE b.id = ANY(${ids}::text[])
        GROUP BY b.id
      `;
    }
    const byBoost = new Map(perBoost.map((r) => [r.boostId, r]));

    const rows: BoostAnalyticsRow[] = boosts.map((b) => {
      const pb = byBoost.get(b.id);
      const picks = Number(pb?.picks ?? 0);
      const confirmed = Number(pb?.confirmed ?? 0);
      const pickRevenueCents = Number(pb?.pickRevenueCents ?? 0);
      const costPerPickCents =
        b.chargedCents > 0 && confirmed > 0
          ? Math.round(b.chargedCents / confirmed)
          : null;
      return {
        id: b.id,
        activityId: b.activityId,
        activityEmoji: b.activity.emoji,
        activityTitle: b.activity.title,
        startsAt: b.startsAt.toISOString(),
        endsAt: b.endsAt.toISOString(),
        cancelledAt: b.cancelledAt ? b.cancelledAt.toISOString() : null,
        chargedCents: b.chargedCents,
        isOverage: b.isOverage,
        state: boostState(b.startsAt, b.endsAt, b.cancelledAt, now),
        picksDuringBoost: picks,
        confirmedDuringBoost: confirmed,
        pickRevenueCents,
        costPerPickCents,
      };
    });

    let totalCharged = 0;
    let overageCount = 0;
    let totalPicks = 0;
    let totalConfirmed = 0;
    for (const r of rows) {
      totalCharged += r.chargedCents;
      if (r.isOverage) overageCount += 1;
      totalPicks += r.picksDuringBoost;
      totalConfirmed += r.confirmedDuringBoost;
    }

    return {
      window,
      totals: {
        totalBoosts: rows.length,
        overageBoosts: overageCount,
        freeBoosts: rows.length - overageCount,
        totalChargedCents: totalCharged,
        totalPicksDuringBoosts: totalPicks,
        totalConfirmedDuringBoosts: totalConfirmed,
      },
      boosts: rows,
    };
  }

  async getSpend(
    businessId: string,
    from?: string,
    to?: string,
  ): Promise<SpendAnalyticsDto> {
    const window = await this.resolveWindow(from, to);
    const { start, endExclusive, priorStart } = windowBounds(window);
    const granularity = pickGranularity(window.days);
    const truncUnit = granularity === 'week' ? 'week' : granularity;

    const [pickRows, boostRows, priorPickRows, priorBoostRows] =
      await Promise.all([
        this.prisma.$queryRaw<SpendPickRow[]>`
          SELECT
            date_trunc(${truncUnit}, vse."createdAt") AS bucket,
            COALESCE(SUM(vse."chargedCents"), 0) AS "spendCents"
          FROM "VenueSuggestionEvent" vse
          JOIN "BusinessVenue" v ON v.id = vse."venueId"
          WHERE v."businessId" = ${businessId}
            AND vse.kind = 'CONFIRMED'
            AND vse."chargedCents" > 0
            AND vse."createdAt" >= ${start}
            AND vse."createdAt" < ${endExclusive}
          GROUP BY 1
          ORDER BY 1 ASC
        `,
        this.prisma.$queryRaw<SpendBoostRow[]>`
          SELECT
            date_trunc(${truncUnit}, b."createdAt") AS bucket,
            COALESCE(SUM(b."chargedCents"), 0) AS "spendCents"
          FROM "ActivityBoost" b
          WHERE b."businessId" = ${businessId}
            AND b."chargedCents" > 0
            AND b."createdAt" >= ${start}
            AND b."createdAt" < ${endExclusive}
          GROUP BY 1
          ORDER BY 1 ASC
        `,
        this.prisma.$queryRaw<{ spendCents: bigint }[]>`
          SELECT COALESCE(SUM(vse."chargedCents"), 0) AS "spendCents"
          FROM "VenueSuggestionEvent" vse
          JOIN "BusinessVenue" v ON v.id = vse."venueId"
          WHERE v."businessId" = ${businessId}
            AND vse.kind = 'CONFIRMED'
            AND vse."chargedCents" > 0
            AND vse."createdAt" >= ${priorStart}
            AND vse."createdAt" < ${start}
        `,
        this.prisma.$queryRaw<{ spendCents: bigint }[]>`
          SELECT COALESCE(SUM(b."chargedCents"), 0) AS "spendCents"
          FROM "ActivityBoost" b
          WHERE b."businessId" = ${businessId}
            AND b."chargedCents" > 0
            AND b."createdAt" >= ${priorStart}
            AND b."createdAt" < ${start}
        `,
      ]);

    const buckets = new Map<string, SpendBucket>();
    for (const r of pickRows) {
      const key = bucketLabel(r.bucket, granularity);
      const existing = buckets.get(key) ?? {
        bucket: key,
        pickSpendCents: 0,
        boostSpendCents: 0,
      };
      existing.pickSpendCents += Number(r.spendCents);
      buckets.set(key, existing);
    }
    for (const r of boostRows) {
      const key = bucketLabel(r.bucket, granularity);
      const existing = buckets.get(key) ?? {
        bucket: key,
        pickSpendCents: 0,
        boostSpendCents: 0,
      };
      existing.boostSpendCents += Number(r.spendCents);
      buckets.set(key, existing);
    }

    const sortedBuckets = Array.from(buckets.values()).sort((a, b) =>
      a.bucket.localeCompare(b.bucket),
    );

    const pickSpendCents = sortedBuckets.reduce(
      (n, b) => n + b.pickSpendCents,
      0,
    );
    const boostSpendCents = sortedBuckets.reduce(
      (n, b) => n + b.boostSpendCents,
      0,
    );

    return {
      window,
      granularity,
      totals: {
        pickSpendCents,
        boostSpendCents,
        totalSpendCents: pickSpendCents + boostSpendCents,
        pickSpendCentsPrior: Number(priorPickRows[0]?.spendCents ?? 0),
        boostSpendCentsPrior: Number(priorBoostRows[0]?.spendCents ?? 0),
      },
      buckets: sortedBuckets,
    };
  }
}
