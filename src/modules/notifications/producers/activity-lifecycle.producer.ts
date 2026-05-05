import { Injectable } from '@nestjs/common';
import { ActivityRole } from '@prisma/client';
import { NOTIFICATION_EVENT } from '../../../common/constants/notification-events';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsQueue } from '../queue/notifications.queue';
import { enqueueIfBuilt } from './enqueue';

@Injectable()
export class ActivityLifecycleNotifications {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: NotificationsQueue,
  ) {}

  async join(activityId: string, joinerUserId: string): Promise<void> {
    await enqueueIfBuilt(this.queue, NOTIFICATION_EVENT.JOIN, async () => {
      const [activity, host, joiner] = await Promise.all([
        this.prisma.activity.findUnique({
          where: { id: activityId },
          select: { title: true, emoji: true },
        }),
        this.findHostUserId(activityId),
        this.prisma.profile.findUnique({
          where: { userId: joinerUserId },
          select: { username: true },
        }),
      ]);
      if (!activity || !host || !joiner) return null;
      if (host === joinerUserId) return null;

      return {
        recipientUserIds: [host],
        payload: {
          activityId,
          activityTitle: activity.title,
          activityEmoji: activity.emoji,
          joinerUsername: joiner.username,
        },
      };
    });
  }

  async leave(
    activityId: string,
    leaverUserId: string,
    wasKicked: boolean,
  ): Promise<void> {
    await enqueueIfBuilt(this.queue, NOTIFICATION_EVENT.LEAVE, async () => {
      const [activity, host, leaver] = await Promise.all([
        this.prisma.activity.findUnique({
          where: { id: activityId },
          select: { title: true, emoji: true },
        }),
        this.findHostUserId(activityId),
        this.prisma.profile.findUnique({
          where: { userId: leaverUserId },
          select: { username: true },
        }),
      ]);
      if (!activity || !host || !leaver) return null;
      if (host === leaverUserId) return null;

      return {
        recipientUserIds: [host],
        payload: {
          activityId,
          activityTitle: activity.title,
          activityEmoji: activity.emoji,
          leaverUsername: leaver.username,
          wasKicked,
        },
      };
    });
  }

  async cancellation(activityId: string): Promise<void> {
    await enqueueIfBuilt(
      this.queue,
      NOTIFICATION_EVENT.CANCELLATION,
      async () => {
        const activity = await this.prisma.activity.findUnique({
          where: { id: activityId },
          select: {
            title: true,
            emoji: true,
            participants: { select: { userId: true, role: true } },
          },
        });
        if (!activity) return null;
        const host = activity.participants.find(
          (p) => p.role === ActivityRole.HOST,
        );
        if (!host) return null;
        const hostProfile = await this.prisma.profile.findUnique({
          where: { userId: host.userId },
          select: { username: true },
        });
        if (!hostProfile) return null;

        const members = activity.participants
          .filter((p) => p.role !== ActivityRole.HOST)
          .map((p) => p.userId);
        if (members.length === 0) return null;

        return {
          recipientUserIds: members,
          payload: {
            activityId,
            activityTitle: activity.title,
            activityEmoji: activity.emoji,
            hostUsername: hostProfile.username,
          },
        };
      },
    );
  }

  private async findHostUserId(activityId: string): Promise<string | null> {
    const row = await this.prisma.activityParticipant.findFirst({
      where: { activityId, role: ActivityRole.HOST },
      select: { userId: true },
    });
    return row?.userId ?? null;
  }
}
