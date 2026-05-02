import type { ActivityStatus } from '@prisma/client';
import type { ChatPreviewRow } from '../chats.interface';

export interface ChatPreviewDto {
  activityId: string;
  title: string;
  emoji: string;
  startsAt: string;
  placeName: string;
  status: ActivityStatus;
  hostUserId: string;
  unreadCount: number;
  lastMessage: {
    id: string;
    body: string | null;
    hasImage: boolean;
    createdAt: string;
    senderUsername: string;
  } | null;
}

export function serializePreview(row: ChatPreviewRow): ChatPreviewDto {
  return {
    activityId: row.activityId,
    title: row.title,
    emoji: row.emoji,
    startsAt: row.startsAt.toISOString(),
    placeName: row.placeName,
    status: row.status,
    hostUserId: row.hostUserId,
    unreadCount: row.unreadCount,
    lastMessage:
      row.lastMessageId && row.lastCreatedAt && row.lastSenderUsername
        ? {
            id: row.lastMessageId,
            body: row.lastBody,
            hasImage: row.lastImageKey != null,
            createdAt: row.lastCreatedAt.toISOString(),
            senderUsername: row.lastSenderUsername,
          }
        : null,
  };
}
