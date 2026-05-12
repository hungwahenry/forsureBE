import type { Profile, User, UserBlock } from '@prisma/client';
import type { StorageProvider } from '../../../../storage/storage.interface';

export interface AdminBlockUserRef {
  id: string;
  email: string;
  profile: {
    username: string;
    displayName: string;
    avatarUrl: string;
  } | null;
}

export interface AdminBlockListItem {
  id: string;
  createdAt: string;
  blocker: AdminBlockUserRef;
  blocked: AdminBlockUserRef;
}

type CounterpartyUser = Pick<User, 'id' | 'email'> & {
  profile: Pick<Profile, 'username' | 'displayName' | 'avatarKey'> | null;
};

type Row = UserBlock & {
  blocker: CounterpartyUser;
  blocked: CounterpartyUser;
};

function toRef(
  storage: StorageProvider,
  user: CounterpartyUser,
): AdminBlockUserRef {
  return {
    id: user.id,
    email: user.email,
    profile: user.profile
      ? {
          username: user.profile.username,
          displayName: user.profile.displayName,
          avatarUrl: storage.publicUrl(user.profile.avatarKey),
        }
      : null,
  };
}

export function serializeAdminBlockListItem(
  storage: StorageProvider,
  row: Row,
): AdminBlockListItem {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    blocker: toRef(storage, row.blocker),
    blocked: toRef(storage, row.blocked),
  };
}
