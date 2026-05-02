import type { ActivityRole, ActivityStatus } from '@prisma/client';

export interface ChatPreviewRow {
  activityId: string;
  title: string;
  emoji: string;
  startsAt: Date;
  placeName: string;
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
