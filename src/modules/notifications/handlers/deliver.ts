import type { NotificationEventCode } from '../../../common/constants/notification-events';
import { sendEmail, type EmailSpec } from './channels/email';
import { sendPush } from './channels/push';
import type { HandlerContext } from './handler.types';

export interface DeliverSpec {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  threadId?: string;
  email?: EmailSpec;
}

/**
 * Single entry point for handlers. Persists an inbox row per recipient
 * (always), then dispatches push and (optionally) email — each gated by
 * the recipient's per-channel preference.
 */
export async function deliverNotification(
  ctx: HandlerContext,
  event: NotificationEventCode,
  recipientUserIds: string[],
  spec: DeliverSpec,
): Promise<void> {
  if (recipientUserIds.length === 0) return;

  const data = spec.data ?? {};

  await ctx.inbox.write(
    recipientUserIds.map((userId) => ({
      userId,
      eventCode: event,
      title: spec.title,
      body: spec.body,
      data,
    })),
  );

  await sendPush(ctx, event, recipientUserIds, {
    title: spec.title,
    body: spec.body,
    data,
    threadId: spec.threadId,
  });

  if (spec.email) {
    await sendEmail(ctx, recipientUserIds, spec.email);
  }
}
