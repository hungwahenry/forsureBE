import { NotificationChannel } from '@prisma/client';

export const NOTIFICATION_EVENT = {
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  REPLY: 'REPLY',
  JOIN: 'JOIN',
  LEAVE: 'LEAVE',
  CANCELLATION: 'CANCELLATION',
  PINNED: 'PINNED',
  NEW_MEMORY: 'NEW_MEMORY',
  ACTIVITY_START_1H: 'ACTIVITY_START_1H',
} as const;

export type NotificationEventCode =
  (typeof NOTIFICATION_EVENT)[keyof typeof NOTIFICATION_EVENT];

export const NOTIFICATION_EVENT_CODES = Object.values(
  NOTIFICATION_EVENT,
) as NotificationEventCode[];

export interface NotificationEventDefaults {
  push: boolean;
  email: boolean;
}

/**
 * Default channel-by-channel state when a user has no explicit preference row.
 * The worker reads this overlaid with the user's overrides.
 */
export const NOTIFICATION_EVENT_DEFAULTS: Record<
  NotificationEventCode,
  NotificationEventDefaults
> = {
  CHAT_MESSAGE: { push: true, email: false },
  REPLY: { push: true, email: false },
  JOIN: { push: true, email: false },
  LEAVE: { push: true, email: false },
  CANCELLATION: { push: true, email: false },
  PINNED: { push: true, email: false },
  NEW_MEMORY: { push: true, email: false },
  ACTIVITY_START_1H: { push: true, email: true },
};

/** Quick lookup for channel-specific defaults. */
export function getEventDefault(
  event: NotificationEventCode,
  channel: NotificationChannel,
): boolean {
  const d = NOTIFICATION_EVENT_DEFAULTS[event];
  return channel === 'PUSH' ? d.push : d.email;
}

export function isNotificationEventCode(v: string): v is NotificationEventCode {
  return (NOTIFICATION_EVENT_CODES as string[]).includes(v);
}
