import type { Profile, RefreshToken, User } from '@prisma/client';
import type { StorageProvider } from '../../../../storage/storage.interface';

export interface AdminSessionListItem {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  isActive: boolean;
  user: {
    id: string;
    email: string;
    profile: {
      username: string;
      displayName: string;
      avatarUrl: string;
    } | null;
  };
}

type Row = RefreshToken & {
  user: Pick<User, 'id' | 'email'> & {
    profile: Pick<Profile, 'username' | 'displayName' | 'avatarKey'> | null;
  };
};

export function serializeAdminSessionListItem(
  storage: StorageProvider,
  row: Row,
  now: Date,
): AdminSessionListItem {
  return {
    id: row.id,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
    expiresAt: row.expiresAt.toISOString(),
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
    isActive: row.revokedAt === null && row.expiresAt > now,
    user: {
      id: row.user.id,
      email: row.user.email,
      profile: row.user.profile
        ? {
            username: row.user.profile.username,
            displayName: row.user.profile.displayName,
            avatarUrl: storage.publicUrl(row.user.profile.avatarKey),
          }
        : null,
    },
  };
}
