import type { NotificationEventCode } from '../../../common/constants/notification-events';
import type { GroupedInboxRow } from '../../inbox/inbox.service';
import { sendEmail, type EmailSpec } from './channels/email';
import { sendPush } from './channels/push';
import type { HandlerContext } from './handler.types';

export interface DeliverSpec {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  threadId?: string;
  email?: EmailSpec;
  groupKey?: string;
  suppressPushFor?: string[];
}

export async function deliverNotification(
  ctx: HandlerContext,
  event: NotificationEventCode,
  recipientUserIds: string[],
  spec: DeliverSpec,
): Promise<void> {
  if (recipientUserIds.length === 0) return;

  const data = spec.data ?? {};

  if (spec.groupKey) {
    await ctx.inbox.writeGrouped(
      recipientUserIds.map((userId): GroupedInboxRow => ({
        userId,
        eventCode: event,
        title: spec.title,
        body: spec.body,
        data,
        groupKey: spec.groupKey!,
      })),
    );
  } else {
    await ctx.inbox.write(
      recipientUserIds.map((userId) => ({
        userId,
        eventCode: event,
        title: spec.title,
        body: spec.body,
        data,
      })),
    );
  }

  const pushRecipients =
    spec.suppressPushFor?.length
      ? recipientUserIds.filter((id) => !spec.suppressPushFor!.includes(id))
      : recipientUserIds;

  await sendPush(ctx, event, pushRecipients, {
    title: spec.title,
    body: spec.body,
    data,
    threadId: spec.threadId,
    collapseId: spec.groupKey ?? spec.threadId,
  });

  if (spec.email) {
    await sendEmail(ctx, recipientUserIds, spec.email);
  }
}
