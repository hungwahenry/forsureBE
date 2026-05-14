import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  OverviewDailyPicks,
  OverviewRecentBoost,
  OverviewTopVenue,
  OwnerBusinessOverviewDto,
} from './overview.serializer';

interface TopVenueRow {
  id: string;
  placeName: string;
  pickCount: number;
  totalCents: number;
}

interface DailyPicksRow {
  day: Date;
  pickCount: number;
  totalCents: number;
}

const DAY_MS = 86_400_000;

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fillDailyPicks(
  rows: DailyPicksRow[],
  startDay: Date,
  days: number,
): OverviewDailyPicks[] {
  const byDay = new Map<string, DailyPicksRow>();
  for (const r of rows) {
    byDay.set(toYmd(startOfUtcDay(r.day)), r);
  }
  const out: OverviewDailyPicks[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDay.getTime() + i * DAY_MS);
    const key = toYmd(d);
    const row = byDay.get(key);
    out.push({
      date: key,
      count: row?.pickCount ?? 0,
      totalCents: row?.totalCents ?? 0,
    });
  }
  return out;
}

@Injectable()
export class BusinessOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async get(businessId: string): Promise<OwnerBusinessOverviewDto> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * DAY_MS);
    const oneDayAhead = new Date(now.getTime() + DAY_MS);
    const dailyWindowStart = startOfUtcDay(
      new Date(now.getTime() - 29 * DAY_MS),
    );

    const activeBoostFilter = {
      businessId,
      cancelledAt: null,
      startsAt: { lte: now },
      endsAt: { gt: now },
    } as const;

    const [
      venuesActive,
      venuesPaused,
      activeBoostsCount,
      boostsEndingTodayCount,
      picks30dAgg,
      picksPrior30dAgg,
      dailyPicksRaw,
      topVenuesRaw,
      recentBoostsRaw,
    ] = await Promise.all([
      this.prisma.businessVenue.count({
        where: { businessId, isPaused: false },
      }),
      this.prisma.businessVenue.count({
        where: { businessId, isPaused: true },
      }),
      this.prisma.activityBoost.count({ where: activeBoostFilter }),
      this.prisma.activityBoost.count({
        where: { ...activeBoostFilter, endsAt: { gt: now, lte: oneDayAhead } },
      }),
      this.prisma.venueSuggestionEvent.aggregate({
        where: {
          kind: 'CONFIRMED',
          chargedCents: { gt: 0 },
          createdAt: { gte: thirtyDaysAgo },
          venue: { businessId },
        },
        _count: { _all: true },
        _sum: { chargedCents: true },
      }),
      this.prisma.venueSuggestionEvent.aggregate({
        where: {
          kind: 'CONFIRMED',
          chargedCents: { gt: 0 },
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          venue: { businessId },
        },
        _count: { _all: true },
        _sum: { chargedCents: true },
      }),
      this.prisma.$queryRaw<DailyPicksRow[]>`
        SELECT
          date_trunc('day', vse."createdAt") AS "day",
          COUNT(*)::int                       AS "pickCount",
          COALESCE(SUM(vse."chargedCents"), 0)::int AS "totalCents"
        FROM "VenueSuggestionEvent" vse
        JOIN "BusinessVenue" v ON v.id = vse."venueId"
        WHERE v."businessId" = ${businessId}
          AND vse."kind" = 'CONFIRMED'
          AND vse."chargedCents" > 0
          AND vse."createdAt" >= ${dailyWindowStart}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      this.prisma.$queryRaw<TopVenueRow[]>`
        SELECT
          v.id              AS "id",
          v."placeName"     AS "placeName",
          COUNT(*)::int     AS "pickCount",
          COALESCE(SUM(vse."chargedCents"), 0)::int AS "totalCents"
        FROM "VenueSuggestionEvent" vse
        JOIN "BusinessVenue" v ON v.id = vse."venueId"
        WHERE v."businessId" = ${businessId}
          AND vse."kind" = 'CONFIRMED'
          AND vse."chargedCents" > 0
          AND vse."createdAt" >= ${thirtyDaysAgo}
        GROUP BY v.id, v."placeName"
        ORDER BY "pickCount" DESC, v."placeName" ASC
        LIMIT 5
      `,
      this.prisma.activityBoost.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          activity: { select: { id: true, emoji: true, title: true } },
        },
      }),
    ]);

    const picksByDay30d = fillDailyPicks(dailyPicksRaw, dailyWindowStart, 30);

    const topVenues30d: OverviewTopVenue[] = topVenuesRaw.map((r) => ({
      id: r.id,
      placeName: r.placeName,
      picksCount: r.pickCount,
      totalCents: r.totalCents,
    }));

    const recentBoosts: OverviewRecentBoost[] = recentBoostsRaw.map((b) => ({
      id: b.id,
      activityId: b.activityId,
      activityEmoji: b.activity.emoji,
      activityTitle: b.activity.title,
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      cancelledAt: b.cancelledAt ? b.cancelledAt.toISOString() : null,
      chargedCents: b.chargedCents,
      isOverage: b.isOverage,
      createdAt: b.createdAt.toISOString(),
    }));

    return {
      venuesCount: venuesActive + venuesPaused,
      venuesActive,
      venuesPaused,
      activeBoostsCount,
      boostsEndingTodayCount,
      venuePicks30d: {
        count: picks30dAgg._count._all,
        totalCents: picks30dAgg._sum.chargedCents ?? 0,
      },
      venuePicksPrior30d: {
        count: picksPrior30dAgg._count._all,
        totalCents: picksPrior30dAgg._sum.chargedCents ?? 0,
      },
      picksByDay30d,
      topVenues30d,
      recentBoosts,
    };
  }
}
