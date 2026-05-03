import { Injectable } from '@nestjs/common';
import { NOTIFICATION_EVENT } from '../../../common/constants/notification-events';
import { sendPushToUsers } from './handler.helpers';
import type {
  HandlerContext,
  HandlerJob,
  NotificationHandler,
} from './handler.types';

export interface LeavePayload {
  activityId: string;
  activityTitle: string;
  activityEmoji: string;
  leaverUsername: string;
  /** True when the host kicked them; false when they left voluntarily. */
  wasKicked: boolean;
}

@Injectable()
export class LeaveHandler implements NotificationHandler<LeavePayload> {
  async handle(ctx: HandlerContext, job: HandlerJob<LeavePayload>): Promise<void> {
    const verb = job.payload.wasKicked ? 'was removed' : 'left';
    await sendPushToUsers(
      ctx,
      NOTIFICATION_EVENT.LEAVE,
      job.recipientUserIds,
      {
        title: `${job.payload.activityEmoji} ${job.payload.activityTitle}`,
        body: `@${job.payload.leaverUsername} ${verb}`,
        data: { type: 'activity', activityId: job.payload.activityId },
      },
    );
  }
}
