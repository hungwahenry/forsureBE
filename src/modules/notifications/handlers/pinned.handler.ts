import { Injectable } from '@nestjs/common';
import { NOTIFICATION_EVENT } from '../../../common/constants/notification-events';
import { deliverNotification } from './deliver';
import type {
  HandlerContext,
  HandlerJob,
  NotificationHandler,
} from './handler.types';

export interface PinnedPayload {
  activityId: string;
  activityTitle: string;
  activityEmoji: string;
  pinnerUsername: string;
  preview: string | null;
}

@Injectable()
export class PinnedHandler implements NotificationHandler<PinnedPayload> {
  async handle(
    ctx: HandlerContext,
    job: HandlerJob<PinnedPayload>,
  ): Promise<void> {
    await deliverNotification(
      ctx,
      NOTIFICATION_EVENT.PINNED,
      job.recipientUserIds,
      {
        title: `${job.payload.activityEmoji} ${job.payload.activityTitle}`,
        body: `@${job.payload.pinnerUsername} pinned a message${
          job.payload.preview ? `: ${job.payload.preview.slice(0, 100)}` : ''
        }`,
        data: { type: 'chat', activityId: job.payload.activityId },
      },
    );
  }
}
