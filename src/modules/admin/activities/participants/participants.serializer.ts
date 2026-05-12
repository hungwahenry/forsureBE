import type { ActivityParticipant, Profile, User } from '@prisma/client';
import type { StorageProvider } from '../../../../storage/storage.interface';

export interface AdminActivityParticipantItem {
  participantId: string;
  role: ActivityParticipant['role'];
  joinedAt: string;
  lastReadAt: string | null;
  user: {
    id: string;
    email: string;
    status: User['status'];
    profile: {
      username: string;
      displayName: string;
      avatarUrl: string;
    } | null;
  };
}

type Row = ActivityParticipant & {
  user: Pick<User, 'id' | 'email' | 'status'> & {
    profile: Pick<Profile, 'username' | 'displayName' | 'avatarKey'> | null;
  };
};

export function serializeAdminActivityParticipant(
  storage: StorageProvider,
  row: Row,
): AdminActivityParticipantItem {
  return {
    participantId: row.id,
    role: row.role,
    joinedAt: row.joinedAt.toISOString(),
    lastReadAt: row.lastReadAt ? row.lastReadAt.toISOString() : null,
    user: {
      id: row.user.id,
      email: row.user.email,
      status: row.user.status,
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
