import { Injectable } from '@nestjs/common';
import { ActivityRole } from '@prisma/client';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  serializeActivityBoost,
  type ActivityBoostDto,
} from '../boosts/boosts.serializer';
import {
  serializeBusinessActivity,
  type BusinessActivityDto,
} from './activities.serializer';

export interface BusinessActivityDetailStats {
  participantCount: number;
  capacity: number;
  postCount: number;
  joinsDuringBoost: number;
  totalBoosts: number;
  totalSpendCents: number;
}

export interface BusinessActivityDetailDto extends BusinessActivityDto {
  boosts: ActivityBoostDto[];
  stats: BusinessActivityDetailStats;
}

@Injectable()
export class BusinessActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<BusinessActivityDto[]> {
    const rows = await this.prisma.activity.findMany({
      where: {
        deletedAt: null,
        participants: { some: { userId, role: ActivityRole.HOST } },
      },
      include: { boosts: true },
      orderBy: { startsAt: 'desc' },
      take: 50,
    });
    return rows.map(serializeBusinessActivity);
  }

  async get(
    userId: string,
    activityId: string,
  ): Promise<BusinessActivityDetailDto> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        boosts: { orderBy: { createdAt: 'desc' } },
        participants: { where: { role: ActivityRole.HOST }, select: { userId: true } },
      },
    });
    if (!activity || activity.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Activity not found.',
      });
    }
    if (activity.participants[0]?.userId !== userId) {
      throw new AppException(ErrorCode.AUTH_FORBIDDEN, {
        message: "Only the host can view this activity's campaigns.",
      });
    }

    const joinsDuringBoost = await this.countJoinsDuringBoost(
      activityId,
      activity.boosts.map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt })),
    );

    const totalSpendCents = activity.boosts.reduce(
      (sum, b) => sum + b.chargedCents,
      0,
    );

    return {
      ...serializeBusinessActivity(activity),
      boosts: activity.boosts.map(serializeActivityBoost),
      stats: {
        participantCount: activity.participantCount,
        capacity: activity.capacity,
        postCount: activity.postCount,
        joinsDuringBoost,
        totalBoosts: activity.boosts.length,
        totalSpendCents,
      },
    };
  }

  private async countJoinsDuringBoost(
    activityId: string,
    windows: { startsAt: Date; endsAt: Date }[],
  ): Promise<number> {
    if (windows.length === 0) return 0;
    const rows = await this.prisma.activityParticipant.findMany({
      where: {
        activityId,
        role: ActivityRole.MEMBER,
        OR: windows.map((w) => ({
          joinedAt: { gte: w.startsAt, lt: w.endsAt },
        })),
      },
      select: { userId: true },
      distinct: ['userId'],
    });
    return rows.length;
  }
}
