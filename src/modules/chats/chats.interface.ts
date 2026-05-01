import type {
  ActivityRole,
  ActivityStatus,
  ChatMessageKind,
} from '@prisma/client';

export interface ChatMessageDto {
  id: string;
  activityId: string;
  kind: ChatMessageKind;
  body: string | null;
  imageUrl: string | null;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  parent: {
    id: string;
    body: string | null;
    hasImage: boolean;
    sender: { id: string; username: string };
  } | null;
}

export interface ChatPreviewDto {
  activityId: string;
  title: string;
  emoji: string;
  startsAt: string;
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

export interface ChatPreviewRow {
  activityId: string;
  title: string;
  emoji: string;
  startsAt: Date;
  status: ActivityStatus;
  hostUserId: string;
  unreadCount: number;
  lastMessageId: string | null;
  lastBody: string | null;
  lastImageKey: string | null;
  lastCreatedAt: Date | null;
  lastSenderUsername: string | null;
}

export interface ChatMembership {
  activityId: string;
  role: ActivityRole;
}

export interface UploadedImageFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}
