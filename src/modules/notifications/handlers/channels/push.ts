import { Logger } from '@nestjs/common';
import type { ExpoPushMessage } from 'expo-server-sdk';
import type { NotificationEventCode } from '../../../../common/constants/notification-events';
import type { HandlerContext } from '../handler.types';
import { filterEnabled } from '../preference-filter';

const log = new Logger('PushChannel');

export interface PushSpec {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** OS-level grouping key (iOS thread / Android tag). */
  threadId?: string;
}

/**
 * Send a push to each user whose PUSH preference is on for `event`. Reaps
 * tokens that come back as DeviceNotRegistered.
 */
export async function sendPush(
  ctx: HandlerContext,
  event: NotificationEventCode,
  recipientUserIds: string[],
  spec: PushSpec,
): Promise<void> {
  const enabled = await filterEnabled(ctx, recipientUserIds, event, 'PUSH');
  if (enabled.length === 0) return;

  const tokens = await fetchTokens(ctx, enabled);
  if (tokens.length === 0) return;

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    title: spec.title,
    body: spec.body,
    data: spec.data,
    sound: 'default',
    ...(spec.threadId ? { threadId: spec.threadId } : {}),
  }));

  const { invalidTokens } = await ctx.expo.send(messages);
  if (invalidTokens.length > 0) {
    log.log({ count: invalidTokens.length }, 'Reaping stale push tokens');
    await ctx.devices.deleteStaleTokens(invalidTokens);
  }
}

async function fetchTokens(
  ctx: HandlerContext,
  userIds: string[],
): Promise<string[]> {
  const rows = await ctx.prisma.notificationDevice.findMany({
    where: { userId: { in: userIds } },
    select: { token: true },
  });
  return rows.map((r) => r.token);
}
