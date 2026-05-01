import type { ChatPreviewDto, ChatPreviewRow } from '../chats.interface';

export function serializePreview(row: ChatPreviewRow): ChatPreviewDto {
  return {
    activityId: row.activityId,
    title: row.title,
    emoji: row.emoji,
    startsAt: row.startsAt.toISOString(),
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
