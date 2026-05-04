import type { Profile, User } from '@prisma/client';
import type { StorageProvider } from '../../storage/storage.interface';

export interface BlockedUserDto {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  blockedAt: string;
}

export type BlockRow = {
  blockedId: string;
  createdAt: Date;
  blocked: User & { profile: Profile | null };
};

export function serializeBlockedUser(
  storage: StorageProvider,
  row: BlockRow,
): BlockedUserDto | null {
  if (!row.blocked.profile) return null;
  return {
    id: row.blocked.id,
    username: row.blocked.profile.username,
    displayName: row.blocked.profile.displayName,
    avatarUrl: storage.publicUrl(row.blocked.profile.avatarKey),
    blockedAt: row.createdAt.toISOString(),
  };
}
