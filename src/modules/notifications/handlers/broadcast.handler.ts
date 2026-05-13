import { Injectable } from '@nestjs/common';
import { NOTIFICATION_EVENT } from '../../../common/constants/notification-events';
import { deliverNotification } from './deliver';
import type {
  HandlerContext,
  HandlerJob,
  NotificationHandler,
} from './handler.types';

export interface BroadcastPayload {
  title: string;
  body: string;
  /** Arbitrary data forwarded to the push payload (e.g. { route: '/activity/act_123' }). */
  data?: Record<string, unknown>;
  /** Stable id used to dedupe / collapse repeated rows in the inbox + push tray. */
  broadcastId: string;
}

@Injectable()
export class BroadcastHandler implements NotificationHandler<BroadcastPayload> {
  async handle(
    ctx: HandlerContext,
    job: HandlerJob<BroadcastPayload>,
  ): Promise<void> {
    const { recipientUserIds, payload } = job;
    if (recipientUserIds.length === 0) return;

    await deliverNotification(
      ctx,
      NOTIFICATION_EVENT.BROADCAST,
      recipientUserIds,
      {
        title: payload.title,
        body: payload.body,
        data: { type: 'broadcast', ...(payload.data ?? {}) },
        threadId: `broadcast:${payload.broadcastId}`,
        groupKey: `BROADCAST:${payload.broadcastId}`,
      },
    );
  }
}
