import { Injectable } from '@nestjs/common';
import { ActivityStatus } from '@prisma/client';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { createId } from '../../../common/utils/id';
import { PrismaService } from '../../../prisma/prisma.service';
import { isGenderAllowedForActivity } from '../gender-policy';

const MIN_LEAD_TIME_MS = 30 * 60_000; // 30 minutes — matches create rule

@Injectable()
export class JoinActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async join(viewerUserId: string, activityId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const activity = await tx.activity.findUnique({
        where: { id: activityId },
      });
      if (!activity) {
        throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
      }
      if (activity.status !== ActivityStatus.OPEN) {
        throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
          message: 'This activity is not open.',
        });
      }
      if (activity.startsAt.getTime() < Date.now() + MIN_LEAD_TIME_MS) {
        throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
          message: 'This activity has already started or starts too soon.',
        });
      }
      if (activity.authorUserId === viewerUserId) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, {
          message: "You're the host of this activity.",
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

      try {
        await tx.activityParticipant.create({
          data: {
            id: createId('ap'),
            activityId,
            userId: viewerUserId,
          },
        });
      } catch (err: unknown) {
        // Unique constraint on (activityId, userId): user already joined.
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code: string }).code === 'P2002'
        ) {
          throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
            message: "You're already going.",
          });
        }
        throw err;
      }
    });
  }

  async leave(viewerUserId: string, activityId: string): Promise<void> {
    // Idempotent — deleting a non-existent participant is a no-op.
    await this.prisma.activityParticipant.deleteMany({
      where: { activityId, userId: viewerUserId },
    });
  }
}
