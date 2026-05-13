import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface AnalyticsDayPoint {
  date: string;
  count: number;
}

export interface EngagementDayPoint {
  date: string;
  activities: number;
  messages: number;
  posts: number;
}

export interface ActivityStatusBreakdownItem {
  status: string;
  count: number;
}

export interface ReportStatusBreakdownItem {
  status: string;
  count: number;
}

export interface AdminAnalytics {
  days: number;
  userGrowth: {
    signupsPerDay: AnalyticsDayPoint[];
    totalSignups: number;
  };
  engagement: {
    daily: EngagementDayPoint[];
    activitiesTotal: number;
    messagesTotal: number;
    postsTotal: number;
  };
  activityHealth: {
    completionRate: number;
    avgFillRate: number;
    statusBreakdown: ActivityStatusBreakdownItem[];
  };
  moderation: {
    reportsPerDay: AnalyticsDayPoint[];
    reportsTotal: number;
    statusBreakdown: ReportStatusBreakdownItem[];
    avgResolutionHours: number | null;
  };
}

export interface CohortRetentionCell {
  weeksAfter: number;
  count: number;
  rate: number;
}

export interface CohortRow {
  cohortWeek: string;
  size: number;
  retention: CohortRetentionCell[];
}

export interface AdminAnalyticsCohorts {
  weeks: number;
  cohorts: CohortRow[];
}

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  percentOfStart: number;
  dropoffFromPrev: number;
}

export interface AdminAnalyticsFunnel {
  days: number;
  cohortSize: number;
  stages: FunnelStage[];
}

export interface PlaceCount {
  placeName: string;
  count: number;
}

export interface AdminAnalyticsGeography {
  days: number;
  topPlacesByUsers: PlaceCount[];
  topPlacesByActivities: PlaceCount[];
}

interface RawDayRow {
  day: Date;
  count: bigint;
}

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(days: number): Promise<AdminAnalytics> {
    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [
      signupRows,
      activityCreateRows,
      messageRows,
      postRows,
      activityCounts,
      activityFillStats,
      reportRows,
      reportStatusCounts,
      avgResolutionHours,
    ] = await Promise.all([
      this.prisma.$queryRaw<RawDayRow[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
        FROM "User"
        WHERE "createdAt" >= ${from}
        GROUP BY day
        ORDER BY day ASC
      `,
      this.prisma.$queryRaw<RawDayRow[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
        FROM "Activity"
        WHERE "createdAt" >= ${from} AND "deletedAt" IS NULL
        GROUP BY day
        ORDER BY day ASC
      `,
      this.prisma.$queryRaw<RawDayRow[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
        FROM "ChatMessage"
        WHERE "createdAt" >= ${from} AND "deletedAt" IS NULL
        GROUP BY day
        ORDER BY day ASC
      `,
      this.prisma.$queryRaw<RawDayRow[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
        FROM "ActivityPost"
        WHERE "createdAt" >= ${from} AND "deletedAt" IS NULL
        GROUP BY day
        ORDER BY day ASC
      `,
      this.prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
        SELECT status, COUNT(*) AS count
        FROM "Activity"
        WHERE "createdAt" >= ${from} AND "deletedAt" IS NULL
        GROUP BY status
      `,
      this.prisma.$queryRaw<
        Array<{ avg_fill: number | null; done_count: bigint; total_count: bigint }>
      >`
        SELECT
          AVG(CASE WHEN status = 'DONE' THEN ("participantCount"::float / NULLIF(capacity, 0)) END) AS avg_fill,
          COUNT(*) FILTER (WHERE status = 'DONE') AS done_count,
          COUNT(*) AS total_count
        FROM "Activity"
        WHERE "createdAt" >= ${from} AND "deletedAt" IS NULL
      `,
      this.prisma.$queryRaw<RawDayRow[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
        FROM "Report"
        WHERE "createdAt" >= ${from}
        GROUP BY day
        ORDER BY day ASC
      `,
      this.prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
        SELECT status, COUNT(*) AS count
        FROM "Report"
        WHERE "createdAt" >= ${from}
        GROUP BY status
      `,
      this.prisma.$queryRaw<Array<{ avg_hours: number | null }>>`
        SELECT AVG(EXTRACT(EPOCH FROM ("reviewedAt" - "createdAt")) / 3600.0) AS avg_hours
        FROM "Report"
        WHERE "createdAt" >= ${from}
          AND "reviewedAt" IS NOT NULL
      `,
    ]);

    const signupsPerDay = this.fillDays(signupRows, from, now);
    const activitiesByDay = this.fillDays(activityCreateRows, from, now);
    const messagesByDay = this.fillDays(messageRows, from, now);
    const postsByDay = this.fillDays(postRows, from, now);
    const reportsPerDay = this.fillDays(reportRows, from, now);

    const engagementDaily: EngagementDayPoint[] = signupsPerDay.map((s, i) => ({
      date: s.date,
      activities: activitiesByDay[i]?.count ?? 0,
      messages: messagesByDay[i]?.count ?? 0,
      posts: postsByDay[i]?.count ?? 0,
    }));

    const statusBreakdown: ActivityStatusBreakdownItem[] = activityCounts.map(
      (r) => ({ status: r.status, count: Number(r.count) }),
    );

    const fillStats = activityFillStats[0];
    const doneCount = fillStats ? Number(fillStats.done_count) : 0;
    const totalCount = fillStats ? Number(fillStats.total_count) : 0;
    const completionRate = totalCount > 0 ? doneCount / totalCount : 0;
    const avgFillRate = fillStats?.avg_fill ?? 0;

    const reportStatusBreakdown: ReportStatusBreakdownItem[] =
      reportStatusCounts.map((r) => ({
        status: r.status,
        count: Number(r.count),
      }));

    const avgHours = avgResolutionHours[0]?.avg_hours ?? null;

    return {
      days,
      userGrowth: {
        signupsPerDay,
        totalSignups: signupsPerDay.reduce((n, p) => n + p.count, 0),
      },
      engagement: {
        daily: engagementDaily,
        activitiesTotal: activitiesByDay.reduce((n, p) => n + p.count, 0),
        messagesTotal: messagesByDay.reduce((n, p) => n + p.count, 0),
        postsTotal: postsByDay.reduce((n, p) => n + p.count, 0),
      },
      activityHealth: {
        completionRate,
        avgFillRate,
        statusBreakdown,
      },
      moderation: {
        reportsPerDay,
        reportsTotal: reportsPerDay.reduce((n, p) => n + p.count, 0),
        statusBreakdown: reportStatusBreakdown,
        avgResolutionHours: avgHours,
      },
    };
  }

  private fillDays(
    rows: RawDayRow[],
    from: Date,
    to: Date,
  ): AnalyticsDayPoint[] {
    const byDay = new Map<string, number>();
    for (const r of rows) {
      byDay.set(r.day.toISOString().slice(0, 10), Number(r.count));
    }
    const points: AnalyticsDayPoint[] = [];
    const start = new Date(from);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setUTCHours(0, 0, 0, 0);
    for (
      let cursor = start;
      cursor <= end;
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
    ) {
      const key = cursor.toISOString().slice(0, 10);
      points.push({ date: key, count: byDay.get(key) ?? 0 });
    }
    return points;
  }

  async getCohorts(weeks: number): Promise<AdminAnalyticsCohorts> {
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const from = new Date(Date.now() - weeks * weekMs);

    // Cohort size by signup week
    const cohortRows = await this.prisma.$queryRaw<
      Array<{ cohort_week: Date; size: bigint }>
    >`
      SELECT date_trunc('week', "createdAt") AS cohort_week, COUNT(*) AS size
      FROM "User"
      WHERE "createdAt" >= ${from}
      GROUP BY cohort_week
      ORDER BY cohort_week ASC
    `;

    // Per-(cohort, weeks_after) distinct active users
    // Active = sent a chat message or joined an activity in that week
    const retentionRows = await this.prisma.$queryRaw<
      Array<{
        cohort_week: Date;
        weeks_after: number;
        active: bigint;
      }>
    >`
      WITH events AS (
        SELECT u.id AS user_id,
               date_trunc('week', u."createdAt") AS cohort_week,
               FLOOR(
                 EXTRACT(EPOCH FROM (cm."createdAt" - u."createdAt")) / 604800
               )::int AS weeks_after
          FROM "User" u
          JOIN "ChatMessage" cm
            ON cm."senderUserId" = u.id
           AND cm."deletedAt" IS NULL
           AND cm."createdAt" >= u."createdAt"
         WHERE u."createdAt" >= ${from}
        UNION
        SELECT u.id AS user_id,
               date_trunc('week', u."createdAt") AS cohort_week,
               FLOOR(
                 EXTRACT(EPOCH FROM (ap."joinedAt" - u."createdAt")) / 604800
               )::int AS weeks_after
          FROM "User" u
          JOIN "ActivityParticipant" ap
            ON ap."userId" = u.id
           AND ap."joinedAt" >= u."createdAt"
         WHERE u."createdAt" >= ${from}
      )
      SELECT cohort_week, weeks_after, COUNT(DISTINCT user_id) AS active
        FROM events
       WHERE weeks_after >= 0
         AND weeks_after < ${weeks}
       GROUP BY cohort_week, weeks_after
       ORDER BY cohort_week ASC, weeks_after ASC
    `;

    const cohorts: CohortRow[] = cohortRows.map((c) => {
      const size = Number(c.size);
      const key = c.cohort_week.toISOString().slice(0, 10);
      const ageWeeks = Math.floor(
        (Date.now() - c.cohort_week.getTime()) / weekMs,
      );
      const maxOffset = Math.min(weeks - 1, ageWeeks);
      const retention: CohortRetentionCell[] = [];
      for (let w = 0; w <= maxOffset; w++) {
        const found = retentionRows.find(
          (r) =>
            r.cohort_week.getTime() === c.cohort_week.getTime() &&
            r.weeks_after === w,
        );
        const count = found ? Number(found.active) : 0;
        retention.push({
          weeksAfter: w,
          count,
          rate: size > 0 ? count / size : 0,
        });
      }
      return { cohortWeek: key, size, retention };
    });

    return { weeks, cohorts };
  }

  async getFunnel(days: number): Promise<AdminAnalyticsFunnel> {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      signedUp,
      emailVerified,
      onboardingCompleted,
      joinedAny,
      sentAnyMessage,
    ] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: from } } }),
      this.prisma.user.count({
        where: {
          createdAt: { gte: from },
          emailVerifiedAt: { not: null },
        },
      }),
      this.prisma.user.count({
        where: {
          createdAt: { gte: from },
          onboardingCompletedAt: { not: null },
        },
      }),
      this.prisma.user.count({
        where: {
          createdAt: { gte: from },
          activityParticipations: { some: {} },
        },
      }),
      this.prisma.user.count({
        where: {
          createdAt: { gte: from },
          chatMessages: { some: { deletedAt: null } },
        },
      }),
    ]);

    const raw = [
      { key: 'signed_up', label: 'Signed up', count: signedUp },
      { key: 'email_verified', label: 'Email verified', count: emailVerified },
      {
        key: 'onboarding_completed',
        label: 'Onboarding completed',
        count: onboardingCompleted,
      },
      { key: 'joined_activity', label: 'Joined an activity', count: joinedAny },
      { key: 'sent_message', label: 'Sent a message', count: sentAnyMessage },
    ];

    const stages: FunnelStage[] = raw.map((s, i) => {
      const percentOfStart = signedUp > 0 ? s.count / signedUp : 0;
      const prev = i > 0 ? raw[i - 1].count : signedUp;
      const dropoff = prev > 0 ? 1 - s.count / prev : 0;
      return {
        key: s.key,
        label: s.label,
        count: s.count,
        percentOfStart,
        dropoffFromPrev: i === 0 ? 0 : dropoff,
      };
    });

    return { days, cohortSize: signedUp, stages };
  }

  async getGeography(
    days: number,
    limit: number,
  ): Promise<AdminAnalyticsGeography> {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [userRows, activityRows] = await Promise.all([
      this.prisma.profile.groupBy({
        by: ['placeName'],
        _count: { _all: true },
        orderBy: { _count: { placeName: 'desc' } },
        take: limit,
      }),
      this.prisma.activity.groupBy({
        by: ['placeName'],
        where: {
          deletedAt: null,
          createdAt: { gte: from },
        },
        _count: { _all: true },
        orderBy: { _count: { placeName: 'desc' } },
        take: limit,
      }),
    ]);

    return {
      days,
      topPlacesByUsers: userRows.map((r) => ({
        placeName: r.placeName,
        count: r._count._all,
      })),
      topPlacesByActivities: activityRows.map((r) => ({
        placeName: r.placeName,
        count: r._count._all,
      })),
    };
  }
}
