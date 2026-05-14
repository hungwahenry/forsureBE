import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { DATA_EXPORT_QUEUE } from '../../account/export/queue/export.queue';
import { NOTIFICATIONS_QUEUE } from '../../notifications/queue/notifications.queue';

export interface OverviewMetric {
  total: number;
  delta24h: number | null;
}

export interface OverviewGrowthPoint {
  date: string;
  count: number;
}

export interface OverviewRecentAction {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
  admin: { id: string; email: string };
}

export interface AdminOverview {
  users: OverviewMetric;
  activeActivities: OverviewMetric;
  pendingReports: number;
  autoPausedBusinesses: number;
  failedJobs24h: number;
  failedCronRuns24h: number;
  growth: OverviewGrowthPoint[];
  recentActions: OverviewRecentAction[];
}

@Injectable()
export class AdminOverviewService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATIONS_QUEUE)
    private readonly notificationsQueue: Queue,
    @InjectQueue(DATA_EXPORT_QUEUE)
    private readonly exportsQueue: Queue,
  ) {}

  async get(): Promise<AdminOverview> {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    const last24h = new Date(now.getTime() - day);
    const prev24h = new Date(now.getTime() - 2 * day);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * day);

    const [
      totalUsers,
      newUsers24h,
      newUsersPrev24h,
      totalActivities,
      newActivities24h,
      newActivitiesPrev24h,
      pendingReports,
      autoPausedBusinesses,
      failedCronRuns24h,
      notifFailed,
      exportFailed,
      recentRows,
      growthRows,
    ] = await Promise.all([
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({
        where: { status: 'ACTIVE', createdAt: { gte: last24h } },
      }),
      this.prisma.user.count({
        where: {
          status: 'ACTIVE',
          createdAt: { gte: prev24h, lt: last24h },
        },
      }),
      this.prisma.activity.count({
        where: {
          deletedAt: null,
          status: { in: ['OPEN', 'FULL'] },
        },
      }),
      this.prisma.activity.count({
        where: {
          deletedAt: null,
          status: { in: ['OPEN', 'FULL'] },
          createdAt: { gte: last24h },
        },
      }),
      this.prisma.activity.count({
        where: {
          deletedAt: null,
          status: { in: ['OPEN', 'FULL'] },
          createdAt: { gte: prev24h, lt: last24h },
        },
      }),
      this.prisma.report.count({ where: { status: 'PENDING' } }),
      this.prisma.business.count({
        where: { autoPausedAt: { not: null }, suspendedAt: null },
      }),
      this.prisma.cronRunLog.count({
        where: { status: 'FAILED', startedAt: { gte: last24h } },
      }),
      this.notificationsQueue.getFailedCount(),
      this.exportsQueue.getFailedCount(),
      this.prisma.adminAuditLog.findMany({
        take: 10,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { admin: { select: { id: true, email: true } } },
      }),
      this.prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
        FROM "User"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY day
        ORDER BY day ASC
      `,
    ]);

    const growth = this.fillGrowthDays(growthRows, thirtyDaysAgo, now);

    return {
      users: {
        total: totalUsers,
        delta24h: newUsers24h - newUsersPrev24h,
      },
      activeActivities: {
        total: totalActivities,
        delta24h: newActivities24h - newActivitiesPrev24h,
      },
      pendingReports,
      autoPausedBusinesses,
      failedJobs24h: notifFailed + exportFailed,
      failedCronRuns24h,
      growth,
      recentActions: recentRows.map((r) => ({
        id: r.id,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        createdAt: r.createdAt.toISOString(),
        admin: { id: r.admin.id, email: r.admin.email },
      })),
    };
  }

  private fillGrowthDays(
    rows: Array<{ day: Date; count: bigint }>,
    from: Date,
    to: Date,
  ): OverviewGrowthPoint[] {
    const byDay = new Map<string, number>();
    for (const r of rows) {
      const key = r.day.toISOString().slice(0, 10);
      byDay.set(key, Number(r.count));
    }
    const points: OverviewGrowthPoint[] = [];
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
