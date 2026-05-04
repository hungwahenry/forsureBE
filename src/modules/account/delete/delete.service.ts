import { Injectable } from '@nestjs/common';
import { ActivityRole, ActivityStatus, UserStatus } from '@prisma/client';
import { STEP_UP_ACTION } from '../../../common/constants/step-up-actions';
import { PrismaService } from '../../../prisma/prisma.service';
import { StepUpService } from '../../step-up/step-up.service';

@Injectable()
export class DeleteAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stepUp: StepUpService,
  ) {}

  async deleteMe(
    userId: string,
    challengeId: string,
    code: string,
  ): Promise<void> {
    await this.stepUp.verifyAndConsume({
      userId,
      challengeId,
      code,
      expectedAction: STEP_UP_ACTION.DELETE_ACCOUNT,
    });

    const hosted = await this.prisma.activityParticipant.findMany({
      where: {
        userId,
        role: ActivityRole.HOST,
        activity: {
          status: { in: [ActivityStatus.OPEN, ActivityStatus.FULL] },
        },
      },
      select: { activityId: true },
    });
    if (hosted.length > 0) {
      await this.prisma.activity.updateMany({
        where: { id: { in: hosted.map((p) => p.activityId) } },
        data: { status: ActivityStatus.CANCELLED },
      });
    }

    const shortId = userId.slice(-12);
    const sentinelEmail = `deleted_${userId}@deleted.local`;
    const sentinelUsername = `deleted_${shortId}`;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.DELETED,
          email: sentinelEmail,
          emailVerifiedAt: null,
        },
      }),
      this.prisma.profile.update({
        where: { userId },
        data: {
          username: sentinelUsername,
          displayName: 'deleted',
          bio: null,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.notificationDevice.deleteMany({ where: { userId } }),
      this.prisma.notificationPreference.deleteMany({ where: { userId } }),
      this.prisma.notification.deleteMany({ where: { userId } }),
      this.prisma.userBlock.deleteMany({
        where: {
          OR: [{ blockerId: userId }, { blockedId: userId }],
        },
      }),
      this.prisma.stepUpChallenge.deleteMany({ where: { userId } }),
      this.prisma.emailVerification.deleteMany({ where: { userId } }),
    ]);
  }
}
