import type { Notification } from '@prisma/client';

export interface NotificationDto {
  id: string;
  eventCode: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export function serializeNotification(n: Notification): NotificationDto {
  return {
    id: n.id,
    eventCode: n.eventCode,
    title: n.title,
    body: n.body,
    data: (n.data ?? {}) as Record<string, unknown>,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}
