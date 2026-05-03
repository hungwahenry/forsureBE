import { Injectable } from '@nestjs/common';
import { NOTIFICATION_EVENT } from '../../../common/constants/notification-events';
import { deliverNotification } from './deliver';
import type {
  HandlerContext,
  HandlerJob,
  NotificationHandler,
} from './handler.types';

export interface ActivityStart1hPayload {
  activityId: string;
  activityTitle: string;
  activityEmoji: string;
  hostUsername: string;
  /** Pre-formatted display string, e.g. "today at 3pm". */
  whenLabel: string;
  placeName: string;
}

@Injectable()
export class ActivityStart1hHandler
  implements NotificationHandler<ActivityStart1hPayload>
{
  async handle(
    ctx: HandlerContext,
    job: HandlerJob<ActivityStart1hPayload>,
  ): Promise<void> {
    const { recipientUserIds, payload } = job;

    const title = `${payload.activityEmoji} ${payload.activityTitle}`;
    const body = `${payload.whenLabel} · ${payload.placeName}`;
    await deliverNotification(
      ctx,
      NOTIFICATION_EVENT.ACTIVITY_START_1H,
      recipientUserIds,
      {
        title: `starting in ~1 hour`,
        body: `${title} · ${body}`,
        data: { type: 'activity', activityId: payload.activityId },
        email: {
          template: 'activity-starts-soon',
          data: {
            activityEmoji: payload.activityEmoji,
            activityTitle: payload.activityTitle,
            hostUsername: payload.hostUsername,
            whenLabel: payload.whenLabel,
            placeName: payload.placeName,
          },
        },
      },
    );
  }
}
