import type { Profile, User } from '@prisma/client';
import type { StorageProvider } from '../../../../storage/storage.interface';

export interface AdminUserListItem {
  id: string;
  email: string;
  status: User['status'];
  role: User['role'];
  createdAt: string;
  lastLoginAt: string | null;
  suspendedUntil: string | null;
  profile: {
    username: string;
    displayName: string;
    avatarUrl: string;
  } | null;
}

type UserWithProfile = User & {
  profile: Pick<Profile, 'username' | 'displayName' | 'avatarKey'> | null;
};

export function serializeAdminUserListItem(
  storage: StorageProvider,
  user: UserWithProfile,
): AdminUserListItem {
  return {
    id: user.id,
    email: user.email,
    status: user.status,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    suspendedUntil: user.suspendedUntil
      ? user.suspendedUntil.toISOString()
      : null,
    profile: user.profile
      ? {
          username: user.profile.username,
          displayName: user.profile.displayName,
          avatarUrl: storage.publicUrl(user.profile.avatarKey),
        }
      : null,
  };
}
