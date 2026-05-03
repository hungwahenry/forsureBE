import { Injectable } from '@nestjs/common';
import { NOTIFICATION_EVENT } from '../../../common/constants/notification-events';
import { sendPushToUsers } from './handler.helpers';
import type {
  HandlerContext,
  HandlerJob,
  NotificationHandler,
} from './handler.types';

export interface NewMemoryPayload {
  activityId: string;
  activityTitle: string;
  activityEmoji: string;
  authorUsername: string;
  photoCount: number;
}

@Injectable()
export class NewMemoryHandler implements NotificationHandler<NewMemoryPayload> {
  async handle(
    ctx: HandlerContext,
    job: HandlerJob<NewMemoryPayload>,
  ): Promise<void> {
    const photoLabel =
      job.payload.photoCount === 1 ? 'a memory' : `${job.payload.photoCount} memories`;
    await sendPushToUsers(
      ctx,
      NOTIFICATION_EVENT.NEW_MEMORY,
      job.recipientUserIds,
      {
        title: `${job.payload.activityEmoji} ${job.payload.activityTitle}`,
        body: `@${job.payload.authorUsername} shared ${photoLabel}`,
        data: { type: 'memory', activityId: job.payload.activityId },
      },
    );
  }
}
