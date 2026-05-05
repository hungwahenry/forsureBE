import { Injectable } from '@nestjs/common';
import { NOTIFICATION_EVENT } from '../../../common/constants/notification-events';
import { deliverNotification } from './deliver';
import type {
  HandlerContext,
  HandlerJob,
  NotificationHandler,
} from './handler.types';

export interface JoinPayload {
  activityId: string;
  activityTitle: string;
  activityEmoji: string;
  joinerUsername: string;
}

@Injectable()
export class JoinHandler implements NotificationHandler<JoinPayload> {
  async handle(
    ctx: HandlerContext,
    job: HandlerJob<JoinPayload>,
  ): Promise<void> {
    await deliverNotification(
      ctx,
      NOTIFICATION_EVENT.JOIN,
      job.recipientUserIds,
      {
        title: `${job.payload.activityEmoji} ${job.payload.activityTitle}`,
        body: `@${job.payload.joinerUsername} joined`,
        data: { type: 'activity', activityId: job.payload.activityId },
      },
    );
  }
}
