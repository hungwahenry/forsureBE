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
}
