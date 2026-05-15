import type {
  BusinessMember,
  BusinessMemberRole,
  Profile,
  User,
} from '@prisma/client';
import type { StorageProvider } from '../../../../storage/storage.interface';

export interface AdminBusinessMemberItem {
  id: string;
  role: BusinessMemberRole;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

type MemberWithUser = BusinessMember & {
  user: User & {
    profile: Pick<Profile, 'username' | 'displayName' | 'avatarKey'> | null;
  };
};

export function serializeAdminBusinessMember(
  storage: StorageProvider,
  row: MemberWithUser,
): AdminBusinessMemberItem {
  return {
    id: row.id,
    role: row.role,
    joinedAt: row.createdAt.toISOString(),
    user: {
      id: row.user.id,
      email: row.user.email,
      username: row.user.profile?.username ?? null,
      displayName: row.user.profile?.displayName ?? null,
      avatarUrl: row.user.profile?.avatarKey
        ? storage.publicUrl(row.user.profile.avatarKey)
        : null,
    },
  };
}
