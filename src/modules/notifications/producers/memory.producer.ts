import { Injectable } from '@nestjs/common';
import { NOTIFICATION_EVENT } from '../../../common/constants/notification-events';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsQueue } from '../queue/notifications.queue';
import { enqueueIfBuilt } from './enqueue';

@Injectable()
export class MemoryNotifications {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: NotificationsQueue,
  ) {}

  async newMemory(postId: string): Promise<void> {
    await enqueueIfBuilt(this.queue, NOTIFICATION_EVENT.NEW_MEMORY, async () => {
      const post = await this.prisma.activityPost.findUnique({
        where: { id: postId },
        select: {
          activityId: true,
          authorId: true,
          photos: { select: { id: true } },
          activity: { select: { title: true, emoji: true } },
        },
      });
      if (!post) return null;

      const [author, participants] = await Promise.all([
        this.prisma.profile.findUnique({
          where: { userId: post.authorId },
          select: { username: true },
        }),
        this.prisma.activityParticipant.findMany({
          where: { activityId: post.activityId, userId: { not: post.authorId } },
          select: { userId: true },
        }),
      ]);
      if (!author || participants.length === 0) return null;

      return {
        recipientUserIds: participants.map((p) => p.userId),
        payload: {
          activityId: post.activityId,
          activityTitle: post.activity.title,
          activityEmoji: post.activity.emoji,
          authorUsername: author.username,
          photoCount: post.photos.length,
        },
      };
    });
  }
}
