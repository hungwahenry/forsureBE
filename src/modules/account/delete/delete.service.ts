import { Inject, Injectable, Logger } from '@nestjs/common';
import { ActivityRole, ActivityStatus, UserStatus } from '@prisma/client';
import { STEP_UP_ACTION } from '../../../common/constants/step-up-actions';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../storage/storage.interface';
import { StepUpService } from '../../step-up/step-up.service';

@Injectable()
export class DeleteAccountService {
  private readonly logger = new Logger(DeleteAccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stepUp: StepUpService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
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

    const blobKeys = await this.collectBlobKeys(userId);

    const sentinelEmail = `deleted_${userId}@deleted.local`;
    const sentinelUsername = `deleted_${userId.slice(-12)}`;

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
      this.prisma.chatMessage.updateMany({
        where: { senderUserId: userId },
        data: { body: null, imageKey: null },
      }),
      this.prisma.activityPost.deleteMany({ where: { authorId: userId } }),
      this.prisma.activityParticipant.deleteMany({
        where: {
          userId,
          role: ActivityRole.MEMBER,
          activity: {
            status: { in: [ActivityStatus.OPEN, ActivityStatus.FULL] },
          },
        },
      }),
      this.prisma.notificationDevice.deleteMany({ where: { userId } }),
      this.prisma.notificationPreference.deleteMany({ where: { userId } }),
      this.prisma.notification.deleteMany({ where: { userId } }),
      this.prisma.userBlock.deleteMany({
        where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      }),
      this.prisma.stepUpChallenge.deleteMany({ where: { userId } }),
      this.prisma.emailChangeChallenge.deleteMany({ where: { userId } }),
      this.prisma.emailVerification.deleteMany({ where: { userId } }),
      this.prisma.dataExportRequest.deleteMany({ where: { userId } }),
      this.prisma.easterEggDiscovery.deleteMany({ where: { userId } }),
    ]);

    await Promise.allSettled(
      blobKeys.map(async (key) => {
        try {
          await this.storage.delete(key);
        } catch (err: unknown) {
          this.logger.warn(
            { err, key },
            'Failed to delete user blob during account delete',
          );
        }
      }),
    );
  }

  private async collectBlobKeys(userId: string): Promise<string[]> {
    const [profile, postPhotos, chatImages, exports] = await Promise.all([
      this.prisma.profile.findUnique({
        where: { userId },
        select: { avatarKey: true },
      }),
      this.prisma.activityPostPhoto.findMany({
        where: { post: { authorId: userId } },
        select: { imageKey: true },
      }),
      this.prisma.chatMessage.findMany({
        where: { senderUserId: userId, imageKey: { not: null } },
        select: { imageKey: true },
      }),
      this.prisma.dataExportRequest.findMany({
        where: { userId, storageKey: { not: null } },
        select: { storageKey: true },
      }),
    ]);

    return [
      ...(profile?.avatarKey ? [profile.avatarKey] : []),
      ...postPhotos.map((p) => p.imageKey),
      ...chatImages
        .map((m) => m.imageKey)
        .filter((k): k is string => k !== null),
      ...exports
        .map((e) => e.storageKey)
        .filter((k): k is string => k !== null),
    ];
  }
}
