import { Injectable } from '@nestjs/common';
import { NOTIFICATION_EVENT } from '../../../common/constants/notification-events';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsQueue } from '../queue/notifications.queue';
import { enqueueIfBuilt } from './enqueue';

@Injectable()
export class ChatNotifications {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: NotificationsQueue,
  ) {}

  async chatMessage(messageId: string): Promise<void> {
    await enqueueIfBuilt(this.queue, NOTIFICATION_EVENT.CHAT_MESSAGE, async () => {
      const msg = await this.prisma.chatMessage.findUnique({
        where: { id: messageId },
        select: {
          activityId: true,
          senderUserId: true,
          body: true,
          imageKey: true,
          parentMessageId: true,
        },
      });
      if (!msg) return null;

      const [activity, sender, participants, parent] = await Promise.all([
        this.prisma.activity.findUnique({
          where: { id: msg.activityId },
          select: { title: true, emoji: true },
        }),
        this.prisma.profile.findUnique({
          where: { userId: msg.senderUserId },
          select: { username: true, displayName: true },
        }),
        this.prisma.activityParticipant.findMany({
          where: {
            activityId: msg.activityId,
            userId: { not: msg.senderUserId },
          },
          select: { userId: true },
        }),
        msg.parentMessageId
          ? this.prisma.chatMessage.findUnique({
              where: { id: msg.parentMessageId },
              select: { senderUserId: true },
            })
          : Promise.resolve(null),
      ]);
      if (!activity || !sender || participants.length === 0) return null;

      const parentAuthorUserId =
        parent && parent.senderUserId !== msg.senderUserId
          ? parent.senderUserId
          : undefined;

      return {
        recipientUserIds: participants.map((p) => p.userId),
        payload: {
          activityId: msg.activityId,
          activityTitle: activity.title,
          activityEmoji: activity.emoji,
          senderUsername: sender.username,
          senderDisplayName: sender.displayName,
          body: msg.body,
          hasImage: msg.imageKey != null,
          parentAuthorUserId,
        },
      };
    });
  }

  async pinned(
    activityId: string,
    messageId: string,
    pinnerUserId: string,
  ): Promise<void> {
    await enqueueIfBuilt(this.queue, NOTIFICATION_EVENT.PINNED, async () => {
      const [activity, message, pinner, participants] = await Promise.all([
        this.prisma.activity.findUnique({
          where: { id: activityId },
          select: { title: true, emoji: true },
        }),
        this.prisma.chatMessage.findUnique({
          where: { id: messageId },
          select: { body: true },
        }),
        this.prisma.profile.findUnique({
          where: { userId: pinnerUserId },
          select: { username: true },
        }),
        this.prisma.activityParticipant.findMany({
          where: { activityId, userId: { not: pinnerUserId } },
          select: { userId: true },
        }),
      ]);
      if (!activity || !pinner || participants.length === 0) return null;

      return {
        recipientUserIds: participants.map((p) => p.userId),
        payload: {
          activityId,
          activityTitle: activity.title,
          activityEmoji: activity.emoji,
          pinnerUsername: pinner.username,
          preview: message?.body ?? null,
        },
      };
    });
  }
}
