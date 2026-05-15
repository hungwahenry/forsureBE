import { Injectable } from '@nestjs/common';
import { ActivityRole, ActivityStatus } from '@prisma/client';
import { AppConfigService } from '../../../common/app-config/app-config.service';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { FeatureFlagService } from '../../../common/feature-flags/feature-flag.service';
import { createId } from '../../../common/utils/id';
import { PrismaService } from '../../../prisma/prisma.service';
import { BlocksService } from '../../blocks/blocks.service';
import { MembershipService } from '../../chats/membership/membership.service';
import { ActivityLifecycleNotifications } from '../../notifications/producers/activity-lifecycle.producer';
import { isGenderAllowedForActivity } from '../gender-policy';

@Injectable()
export class JoinActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly notifications: ActivityLifecycleNotifications,
    private readonly blocks: BlocksService,
    private readonly featureFlags: FeatureFlagService,
    private readonly appConfig: AppConfigService,
  ) {}

  async join(viewerUserId: string, activityId: string): Promise<void> {
    const joiningEnabled = await this.featureFlags.isEnabled(
      'activity_joining_enabled',
      true,
    );
    if (!joiningEnabled) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'Joining new activities is temporarily disabled.',
      });
    }
    await this.prisma.$transaction(async (tx) => {
      const activity = await tx.activity.findUnique({
        where: { id: activityId },
      });
      if (!activity || activity.deletedAt) {
        throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
      }
      if (activity.status !== ActivityStatus.OPEN) {
        throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
          message: 'This activity is not open.',
        });
      }
      const minLeadMinutes = await this.appConfig.getInt(
        'activity.min_lead_time_minutes',
      );
      if (activity.startsAt.getTime() < Date.now() + minLeadMinutes * 60_000) {
        throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
          message: 'This activity has already started or starts too soon.',
        });
      }

      const profile = await tx.profile.findUnique({
        where: { userId: viewerUserId },
        select: { gender: true },
      });
      if (!profile) {
        throw new AppException(ErrorCode.ONBOARDING_REQUIRED);
      }
      if (
        !isGenderAllowedForActivity(profile.gender, activity.genderPreference)
      ) {
        throw new AppException(ErrorCode.AUTH_FORBIDDEN, {
          message: 'This activity is not for you.',
        });
      }

      if (activity.participantCount >= activity.capacity) {
        throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
          message: 'This activity is full.',
        });
      }

      const host = await tx.activityParticipant.findFirst({
        where: { activityId, role: ActivityRole.HOST },
        select: { userId: true },
      });
      if (
        host &&
        (await this.blocks.isEitherBlocked(viewerUserId, host.userId))
      ) {
        throw new AppException(ErrorCode.AUTH_FORBIDDEN, {
          message: "You can't join this activity.",
        });
      }

      const activeCount = await tx.activityParticipant.count({
        where: {
          userId: viewerUserId,
          activity: { status: ActivityStatus.OPEN },
        },
      });
      const maxConcurrent = await this.appConfig.getInt(
        'activity.max_concurrent_per_user',
      );
      if (activeCount >= maxConcurrent) {
        throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
          message: `You can't join more than ${maxConcurrent} activities at a time.`,
        });
      }

      try {
        await tx.activityParticipant.create({
          data: {
            id: createId('ap'),
            activityId,
            userId: viewerUserId,
            role: ActivityRole.MEMBER,
          },
        });
        await tx.activity.update({
          where: { id: activityId },
          data: { participantCount: { increment: 1 } },
        });
        await tx.profile.update({
          where: { userId: viewerUserId },
          data: { activitiesJoinedCount: { increment: 1 } },
        });
      } catch (err: unknown) {
        // Unique on (activityId, userId): viewer is the host or already joined.
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code: string }).code === 'P2002'
        ) {
          throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
            message: "You're already in this activity.",
          });
        }
        throw err;
      }
    });

    await this.membership.addToChat(viewerUserId, activityId);
    void this.notifications.join(activityId, viewerUserId);
  }

  async leave(viewerUserId: string, activityId: string): Promise<void> {
    // Idempotent — and host can never leave their own activity.
    const removed = await this.prisma.$transaction(async (tx) => {
      const result = await tx.activityParticipant.deleteMany({
        where: {
          activityId,
          userId: viewerUserId,
          role: ActivityRole.MEMBER,
        },
      });
      if (result.count > 0) {
        await tx.activity.update({
          where: { id: activityId },
          data: { participantCount: { decrement: 1 } },
        });
        await tx.profile.update({
          where: { userId: viewerUserId },
          data: { activitiesJoinedCount: { decrement: 1 } },
        });
      }
      return result.count > 0;
    });
    if (removed) {
      await this.membership.removeFromChat(viewerUserId, activityId);
      void this.notifications.leave(activityId, viewerUserId, false);
    }
  }
}
