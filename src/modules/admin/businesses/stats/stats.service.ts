import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  serializeAdminBusinessesStats,
  type AdminBusinessesStats,
} from './stats.serializer';

@Injectable()
export class AdminBusinessesStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async stats(): Promise<AdminBusinessesStats> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

    const [
      activeSubscriptions,
      activeBoosts,
      suspendedCount,
      autoPausedCount,
      picksAgg,
    ] = await Promise.all([
      this.prisma.business.count({
        where: {
          stripeSubscriptionId: { not: null },
          suspendedAt: null,
          autoPausedAt: null,
          OR: [
            { stripeSubscriptionStatus: null },
            { stripeSubscriptionStatus: 'active' },
            { stripeSubscriptionStatus: 'trialing' },
            { stripeSubscriptionStatus: 'past_due' },
          ],
        },
      }),
      this.prisma.activityBoost.count({
        where: {
          cancelledAt: null,
          startsAt: { lte: now },
          endsAt: { gt: now },
        },
      }),
      this.prisma.business.count({ where: { suspendedAt: { not: null } } }),
      this.prisma.business.count({
        where: { autoPausedAt: { not: null }, suspendedAt: null },
      }),
      this.prisma.venueSuggestionEvent.aggregate({
        where: {
          kind: 'CONFIRMED',
          chargedCents: { gt: 0 },
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: { _all: true },
        _sum: { chargedCents: true },
      }),
    ]);

    return serializeAdminBusinessesStats({
      activeSubscriptions,
      activeBoosts,
      suspendedCount,
      autoPausedCount,
      venuePicks30d: {
        count: picksAgg._count._all,
        totalCents: picksAgg._sum.chargedCents ?? 0,
      },
    });
  }
}
