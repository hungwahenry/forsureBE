export interface ChatMessageDto {
  id: string;
  activityId: string;
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
