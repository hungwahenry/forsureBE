import type {
  Activity,
  ChatMessage,
  Profile,
  User,
} from '@prisma/client';
import type { StorageProvider } from '../../../../storage/storage.interface';

export interface AdminMessageListItem {
  id: string;
  kind: ChatMessage['kind'];
  body: string | null;
  imageUrl: string | null;
  createdAt: string;
  deletedAt: string | null;
  deletedReason: string | null;
  parentMessageId: string | null;
  sender: {
    id: string;
    email: string;
    profile: {
      username: string;
      displayName: string;
      avatarUrl: string;
    } | null;
  };
  activity: {
    id: string;
    emoji: string;
    title: string;
  };
}

type Row = ChatMessage & {
  sender: Pick<User, 'id' | 'email'> & {
    profile: Pick<Profile, 'username' | 'displayName' | 'avatarKey'> | null;
  };
  activity: Pick<Activity, 'id' | 'emoji' | 'title'>;
};

export function serializeAdminMessageListItem(
  storage: StorageProvider,
  row: Row,
): AdminMessageListItem {
  return {
    id: row.id,
    kind: row.kind,
    body: row.body,
    imageUrl: row.imageKey ? storage.publicUrl(row.imageKey) : null,
    createdAt: row.createdAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    deletedReason: row.deletedReason,
    parentMessageId: row.parentMessageId,
    sender: {
      id: row.sender.id,
      email: row.sender.email,
      profile: row.sender.profile
        ? {
            username: row.sender.profile.username,
            displayName: row.sender.profile.displayName,
            avatarUrl: storage.publicUrl(row.sender.profile.avatarKey),
          }
        : null,
    },
    activity: row.activity,
  };
}
