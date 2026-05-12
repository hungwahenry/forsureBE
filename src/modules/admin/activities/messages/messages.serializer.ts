import type { ChatMessage, Profile, User } from '@prisma/client';
import type { StorageProvider } from '../../../../storage/storage.interface';

export interface AdminActivityMessageItem {
  id: string;
  kind: ChatMessage['kind'];
  body: string | null;
  imageUrl: string | null;
  parentMessageId: string | null;
  createdAt: string;
  deletedAt: string | null;
  sender: {
    id: string;
    email: string;
    profile: {
      username: string;
      displayName: string;
      avatarUrl: string;
    } | null;
  } | null;
}

type Row = ChatMessage & {
  sender: Pick<User, 'id' | 'email'> & {
    profile: Pick<Profile, 'username' | 'displayName' | 'avatarKey'> | null;
  };
};

export function serializeAdminActivityMessage(
  storage: StorageProvider,
  row: Row,
): AdminActivityMessageItem {
  return {
    id: row.id,
    kind: row.kind,
    body: row.body,
    imageUrl: row.imageKey ? storage.publicUrl(row.imageKey) : null,
    parentMessageId: row.parentMessageId,
    createdAt: row.createdAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    sender: row.sender
      ? {
          id: row.sender.id,
          email: row.sender.email,
          profile: row.sender.profile
            ? {
                username: row.sender.profile.username,
                displayName: row.sender.profile.displayName,
                avatarUrl: storage.publicUrl(row.sender.profile.avatarKey),
              }
            : null,
        }
      : null,
  };
}
