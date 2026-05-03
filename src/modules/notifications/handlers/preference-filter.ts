import type { NotificationChannel } from '@prisma/client';
import type { NotificationEventCode } from '../../../common/constants/notification-events';
import type { HandlerContext } from './handler.types';

/** Reduce recipients to those whose preference for the channel is enabled. */
export async function filterEnabled(
  ctx: HandlerContext,
  userIds: string[],
  event: NotificationEventCode,
  channel: NotificationChannel,
): Promise<string[]> {
  const checks = await Promise.all(
    userIds.map(async (id) => ({
      id,
      enabled: await ctx.preferences.isEnabled(id, event, channel),
    })),
  );
  return checks.filter((c) => c.enabled).map((c) => c.id);
}
