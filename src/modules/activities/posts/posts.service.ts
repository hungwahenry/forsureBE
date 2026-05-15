import { Inject, Injectable } from '@nestjs/common';
import {
  ActivityRole,
  ActivityStatus,
  PostVisibility,
  Prisma,
} from '@prisma/client';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { FeatureFlagService } from '../../../common/feature-flags/feature-flag.service';
import { createId } from '../../../common/utils/id';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../storage/storage.interface';
import type { UploadedImageFile } from '../../chats/chats.interface';
import { MembershipService } from '../../chats/membership/membership.service';
import { MemoryNotifications } from '../../notifications/producers/memory.producer';
import { UpsertPostDto } from './dto/upsert-post.dto';
import { POST_MAX_PHOTOS, processAndStorePostImage } from './posts.images';
import {
  postInclude,
  serializePost,
  type ActivityPostDto,
} from './posts.serializer';

const POST_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class ActivityPostsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
    private readonly membership: MembershipService,
    private readonly notifications: MemoryNotifications,
    private readonly featureFlags: FeatureFlagService,
  ) {}

  async listPosts(
    userId: string,
    activityId: string,
  ): Promise<ActivityPostDto[]> {
    const activity = await this.requireActivity(activityId);
    const isParticipant = await this.isParticipant(userId, activityId);

    let where: Prisma.ActivityPostWhereInput;
    if (isParticipant) {
      where = { activityId, deletedAt: null };
    } else {
      const publiclyVisible =
        activity.status === ActivityStatus.DONE &&
        activity.memoriesShareablePublicly;
      if (!publiclyVisible) {
        throw new AppException(ErrorCode.AUTH_FORBIDDEN);
      }
      where = {
        activityId,
        visibility: PostVisibility.PUBLIC,
        deletedAt: null,
      };
    }

    const posts = await this.prisma.activityPost.findMany({
      where,
      include: postInclude,
      orderBy: { createdAt: 'desc' },
    });
    return posts.map((p) => serializePost(this.storage, p));
  }

  async getMyPost(
    userId: string,
    activityId: string,
  ): Promise<ActivityPostDto | null> {
    await this.membership.requireChatMembership(userId, activityId);
    const post = await this.prisma.activityPost.findFirst({
      where: { activityId, authorId: userId, deletedAt: null },
      include: postInclude,
    });
    return post ? serializePost(this.storage, post) : null;
  }

  async upsertPost(
    userId: string,
    activityId: string,
    dto: UpsertPostDto,
    files: UploadedImageFile[],
  ): Promise<ActivityPostDto> {
    await this.membership.requireChatMembership(userId, activityId);
    const activity = await this.requireActivity(activityId);
    this.requireWithinPostingWindow(activity);

    const desiredVisibility = await this.resolveVisibility(
      activity,
      dto.visibility,
    );

    const existing = await this.prisma.activityPost.findUnique({
      where: { activityId_authorId: { activityId, authorId: userId } },
      include: { photos: true },
    });

    if (!existing) {
      if (files.length === 0) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, {
          message: 'Add at least one photo.',
        });
      }
      if (files.length > POST_MAX_PHOTOS) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, {
          message: `You can post at most ${POST_MAX_PHOTOS} photos.`,
        });
      }

      const postId = createId('pst');
      const imageKeys = await Promise.all(
        files.map((f) =>
          processAndStorePostImage(this.storage, activityId, postId, f),
        ),
      );

      const created = await this.prisma.activityPost.create({
        data: {
          id: postId,
          activityId,
          authorId: userId,
          caption: dto.caption?.trim() || null,
          visibility: desiredVisibility,
          photos: {
            create: imageKeys.map((imageKey, index) => ({
              id: createId('pph'),
              imageKey,
              sortOrder: index,
            })),
          },
        },
        include: postInclude,
      });

      // Increment denormalized counts (fire-and-forget — non-critical).
      void Promise.all([
        this.prisma.profile.update({
          where: { userId },
          data: {
            memoriesPostedCount: { increment: 1 },
            photosSharedCount: { increment: imageKeys.length },
          },
        }),
        this.prisma.activity.update({
          where: { id: activityId },
          data: { postCount: { increment: 1 } },
        }),
      ]).catch(() => undefined);

      void this.notifications.newMemory(created.id);
      return serializePost(this.storage, created);
    }

    const keepIds = new Set(
      dto.keepPhotoIds ?? existing.photos.map((p) => p.id),
    );
    const kept = existing.photos.filter((p) => keepIds.has(p.id));
    const dropped = existing.photos.filter((p) => !keepIds.has(p.id));

    const totalAfter = kept.length + files.length;
    if (totalAfter === 0) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'A post needs at least one photo.',
      });
    }
    if (totalAfter > POST_MAX_PHOTOS) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: `You can post at most ${POST_MAX_PHOTOS} photos.`,
      });
    }

    const newImageKeys = await Promise.all(
      files.map((f) =>
        processAndStorePostImage(this.storage, activityId, existing.id, f),
      ),
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dropped.length > 0) {
        await tx.activityPostPhoto.deleteMany({
          where: { id: { in: dropped.map((p) => p.id) } },
        });
      }
      const baseSort = kept.length;
      if (newImageKeys.length > 0) {
        await tx.activityPostPhoto.createMany({
          data: newImageKeys.map((imageKey, index) => ({
            id: createId('pph'),
            postId: existing.id,
            imageKey,
            sortOrder: baseSort + index,
          })),
        });
      }
      return tx.activityPost.update({
        where: { id: existing.id },
        data: {
          caption:
            dto.caption !== undefined
              ? dto.caption.trim() || null
              : existing.caption,
          visibility: desiredVisibility,
        },
        include: postInclude,
      });
    });

    void Promise.all(dropped.map((p) => this.storage.delete(p.imageKey))).catch(
      () => undefined,
    );

    return serializePost(this.storage, updated);
  }

  async deletePost(
    userId: string,
    activityId: string,
    postId: string,
  ): Promise<void> {
    const post = await this.prisma.activityPost.findUnique({
      where: { id: postId },
      include: { photos: true },
    });
    if (!post || post.activityId !== activityId) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
    }
    const isAuthor = post.authorId === userId;
    if (!isAuthor) {
      const membership = await this.membership.requireChatMembership(
        userId,
        activityId,
      );
      if (membership.role !== ActivityRole.HOST) {
        throw new AppException(ErrorCode.AUTH_FORBIDDEN);
      }
    }
    await this.prisma.activityPost.delete({ where: { id: postId } });
    void Promise.all(
      post.photos.map((p) => this.storage.delete(p.imageKey)),
    ).catch(() => undefined);
  }

  private async requireActivity(activityId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        status: true,
        startsAt: true,
        memoriesShareablePublicly: true,
        deletedAt: true,
      },
    });
    if (!activity || activity.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
    }
    return activity;
  }

  private requireWithinPostingWindow(activity: {
    status: ActivityStatus;
    startsAt: Date;
  }) {
    if (activity.status !== ActivityStatus.DONE) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'You can post memories once the activity has ended.',
      });
    }
    const cutoff = activity.startsAt.getTime() + POST_WINDOW_MS;
    if (Date.now() > cutoff) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: "It's too late to post memories from this activity.",
      });
    }
  }

  private async resolveVisibility(
    activity: { memoriesShareablePublicly: boolean },
    requested: PostVisibility | undefined,
  ): Promise<PostVisibility> {
    if (!activity.memoriesShareablePublicly) {
      return PostVisibility.PARTICIPANTS;
    }
    const sharingEnabled = await this.featureFlags.isEnabled(
      'public_memories_sharing_enabled',
      true,
    );
    if (!sharingEnabled) {
      return PostVisibility.PARTICIPANTS;
    }
    return requested ?? PostVisibility.PARTICIPANTS;
  }

  private async isParticipant(
    userId: string,
    activityId: string,
  ): Promise<boolean> {
    const row = await this.prisma.activityParticipant.findUnique({
      where: { activityId_userId: { activityId, userId } },
      select: { activityId: true },
    });
    return row !== null;
  }
}
