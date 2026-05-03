import { Logger } from '@nestjs/common';
import type { ExpoPushMessage } from 'expo-server-sdk';
import type { NotificationEventCode } from '../../../common/constants/notification-events';
import type { HandlerContext } from './handler.types';

const log = new Logger('NotificationHandler');

/** Map userId → list of valid Expo push tokens. */
export async function fetchPushTokens(
  ctx: HandlerContext,
  userIds: string[],
): Promise<Map<string, string[]>> {
  if (userIds.length === 0) return new Map();
  const rows = await ctx.prisma.notificationDevice.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, token: true },
  });
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const list = map.get(r.userId) ?? [];
    list.push(r.token);
    map.set(r.userId, list);
  }
  return map;
}

/** Map userId → email. Skips users without an email (shouldn't happen). */
export async function fetchEmails(
  ctx: HandlerContext,
  userIds: string[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const rows = await ctx.prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true },
  });
  const map = new Map<string, string>();
  for (const r of rows) map.set(r.id, r.email);
  return map;
}

/** Filter recipients by their per-channel preference (or fall back to defaults). */
export async function filterEnabled(
  ctx: HandlerContext,
  userIds: string[],
  event: NotificationEventCode,
  channel: 'PUSH' | 'EMAIL',
): Promise<string[]> {
  const checks = await Promise.all(
    userIds.map(async (id) => ({
      id,
      enabled: await ctx.preferences.isEnabled(id, event, channel),
    })),
  );
  return checks.filter((c) => c.enabled).map((c) => c.id);
}

interface PushSpec {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** Categorizes for OS-level grouping; chat messages should set this. */
  threadId?: string;
}

/**
 * Build + send push to a list of users. Filters by preference, fetches tokens,
 * sends via Expo, and reaps tokens that came back as DeviceNotRegistered.
 */
export async function sendPushToUsers(
  ctx: HandlerContext,
  event: NotificationEventCode,
  recipientUserIds: string[],
  spec: PushSpec,
): Promise<void> {
  const enabled = await filterEnabled(ctx, recipientUserIds, event, 'PUSH');
  if (enabled.length === 0) return;
  const tokenMap = await fetchPushTokens(ctx, enabled);
  const messages: ExpoPushMessage[] = [];
  for (const userId of enabled) {
    const tokens = tokenMap.get(userId);
    if (!tokens || tokens.length === 0) continue;
    for (const token of tokens) {
      messages.push({
        to: token,
        title: spec.title,
        body: spec.body,
        data: spec.data,
        sound: 'default',
        ...(spec.threadId ? { threadId: spec.threadId } : {}),
      });
    }
  }
  if (messages.length === 0) return;
  const { invalidTokens } = await ctx.expo.send(messages);
  if (invalidTokens.length > 0) {
    log.log({ count: invalidTokens.length }, 'Reaping stale push tokens');
    await ctx.devices.deleteStaleTokens(invalidTokens);
  }
}

interface EmailSpec {
  template: string;
  data: Record<string, unknown>;
}

/**
 * Send email to each recipient (filtered by preference). Failures are logged
 * per-user but don't abort the batch.
 */
export async function sendEmailToUsers(
  ctx: HandlerContext,
  event: NotificationEventCode,
  recipientUserIds: string[],
  spec: EmailSpec,
): Promise<void> {
  const enabled = await filterEnabled(ctx, recipientUserIds, event, 'EMAIL');
  if (enabled.length === 0) return;
  const emailMap = await fetchEmails(ctx, enabled);
  await Promise.all(
    [...emailMap.entries()].map(async ([userId, addr]) => {
      try {
        await ctx.email.send({
          to: addr,
          template: spec.template,
          data: spec.data,
        });
      } catch (err) {
        log.error({ err, userId, template: spec.template }, 'Email send failed');
      }
    }),
  );
}
