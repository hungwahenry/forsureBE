import { Injectable } from '@nestjs/common';
import { NOTIFICATION_EVENT } from '../../../common/constants/notification-events';
import { deliverNotification } from './deliver';
import type {
  HandlerContext,
  HandlerJob,
  NotificationHandler,
} from './handler.types';

export interface CancellationPayload {
  activityId: string;
  activityTitle: string;
  activityEmoji: string;
  hostUsername: string;
}

@Injectable()
export class CancellationHandler implements NotificationHandler<CancellationPayload> {
  async handle(
    ctx: HandlerContext,
    job: HandlerJob<CancellationPayload>,
  ): Promise<void> {
    await deliverNotification(
      ctx,
      NOTIFICATION_EVENT.CANCELLATION,
      job.recipientUserIds,
      {
        title: 'activity cancelled',
        body: `@${job.payload.hostUsername} cancelled ${job.payload.activityEmoji} ${job.payload.activityTitle}`,
        data: { type: 'activity', activityId: job.payload.activityId },
      },
    );
  }
}
