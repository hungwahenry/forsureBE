import { Injectable } from '@nestjs/common';
import { NOTIFICATION_EVENT } from '../../../common/constants/notification-events';
import { sendPushToUsers } from './handler.helpers';
import type {
  HandlerContext,
  HandlerJob,
  NotificationHandler,
} from './handler.types';

export interface ChatMessagePayload {
  activityId: string;
  activityTitle: string;
  activityEmoji: string;
  senderUsername: string;
  senderDisplayName: string;
  body: string | null;
  hasImage: boolean;
  /** When set, this is a reply — handler picks the REPLY event for the parent author. */
  parentAuthorUserId?: string;
}

@Injectable()
export class ChatMessageHandler implements NotificationHandler<ChatMessagePayload> {
  async handle(ctx: HandlerContext, job: HandlerJob<ChatMessagePayload>): Promise<void> {
    const { recipientUserIds, payload } = job;
    if (recipientUserIds.length === 0) return;

    const preview = payload.body
      ? payload.body.slice(0, 140)
      : payload.hasImage
        ? '📷 photo'
        : '';
    const title = `${payload.activityEmoji} ${payload.activityTitle}`;
    const body = `@${payload.senderUsername}: ${preview}`.trim();

    const others = payload.parentAuthorUserId
      ? recipientUserIds.filter((id) => id !== payload.parentAuthorUserId)
      : recipientUserIds;

    if (payload.parentAuthorUserId) {
      await sendPushToUsers(
        ctx,
        NOTIFICATION_EVENT.REPLY,
        [payload.parentAuthorUserId],
        {
          title: `@${payload.senderUsername} replied`,
          body: preview,
          threadId: `chat:${payload.activityId}`,
          data: { type: 'chat', activityId: payload.activityId },
        },
      );
    }

    await sendPushToUsers(ctx, NOTIFICATION_EVENT.CHAT_MESSAGE, others, {
      title,
      body,
      threadId: `chat:${payload.activityId}`,
      data: { type: 'chat', activityId: payload.activityId },
    });
  }
}
