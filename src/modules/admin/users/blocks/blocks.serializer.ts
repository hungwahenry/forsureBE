import type { UserBlock } from '@prisma/client';
import type { StorageProvider } from '../../../../storage/storage.interface';
import { BlockDirection } from './dto/list-user-blocks.dto';

export interface AdminUserBlockItem {
  id: string;
  createdAt: string;
  otherUser: {
    id: string;
    email: string;
    profile: {
      username: string;
      displayName: string;
      avatarUrl: string;
    } | null;
  };
}

interface CounterpartyUser {
  id: string;
  email: string;
  profile: {
    username: string;
    displayName: string;
    avatarKey: string;
  } | null;
}

type Row = UserBlock & {
  blocker: CounterpartyUser;
  blocked: CounterpartyUser;
};

export function serializeAdminUserBlock(
  storage: StorageProvider,
  row: Row,
  direction: BlockDirection,
): AdminUserBlockItem {
  const other = direction === BlockDirection.MADE ? row.blocked : row.blocker;
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    otherUser: {
      id: other.id,
      email: other.email,
      profile: other.profile
        ? {
            username: other.profile.username,
            displayName: other.profile.displayName,
            avatarUrl: storage.publicUrl(other.profile.avatarKey),
          }
        : null,
    },
  };
}
