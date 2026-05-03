import { Injectable } from '@nestjs/common';
import { ActivityRole } from '@prisma/client';
import { NOTIFICATION_EVENT } from '../../../common/constants/notification-events';
import { formatTime } from '../../../common/utils/format';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsQueue } from '../queue/notifications.queue';
import { enqueueIfBuilt } from './enqueue';

@Injectable()
export class ActivityReminderNotifications {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: NotificationsQueue,
  ) {}

  async activityStart1h(activityId: string): Promise<void> {
    await enqueueIfBuilt(
      this.queue,
      NOTIFICATION_EVENT.ACTIVITY_START_1H,
      async () => {
        const activity = await this.prisma.activity.findUnique({
          where: { id: activityId },
          select: {
            title: true,
            emoji: true,
            startsAt: true,
            placeName: true,
            participants: { select: { userId: true, role: true } },
          },
        });
        if (!activity || activity.participants.length === 0) return null;

        const host = activity.participants.find(
          (p) => p.role === ActivityRole.HOST,
        );
        const hostProfile = host
          ? await this.prisma.profile.findUnique({
              where: { userId: host.userId },
              select: { username: true },
            })
          : null;

        return {
          recipientUserIds: activity.participants.map((p) => p.userId),
          payload: {
            activityId,
            activityTitle: activity.title,
            activityEmoji: activity.emoji,
            hostUsername: hostProfile?.username ?? '',
            whenLabel: formatTime(activity.startsAt),
            placeName: activity.placeName,
          },
          // Idempotent across overlapping cron windows.
          dedupKey: `start1h:${activityId}`,
          retainCompletedSeconds: 3600,
        };
      },
    );
  }
}
