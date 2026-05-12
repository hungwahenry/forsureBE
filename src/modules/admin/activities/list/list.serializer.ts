import type { Activity, Profile, User } from '@prisma/client';
import type { StorageProvider } from '../../../../storage/storage.interface';

export interface AdminActivityListItem {
  id: string;
  emoji: string;
  title: string;
  startsAt: string;
  status: Activity['status'];
  placeName: string;
  capacity: number;
  participantCount: number;
  messageCount: number;
  postCount: number;
  genderPreference: Activity['genderPreference'];
  createdAt: string;
  deletedAt: string | null;
  host: {
    id: string;
    email: string;
    profile: {
      username: string;
      displayName: string;
      avatarUrl: string;
    } | null;
  } | null;
}

type HostUser = Pick<User, 'id' | 'email'> & {
  profile: Pick<Profile, 'username' | 'displayName' | 'avatarKey'> | null;
};

type Row = Activity & {
  participants: { user: HostUser }[];
};

export function serializeAdminActivityListItem(
  storage: StorageProvider,
  row: Row,
): AdminActivityListItem {
  const host = row.participants[0]?.user;
  return {
    id: row.id,
    emoji: row.emoji,
    title: row.title,
    startsAt: row.startsAt.toISOString(),
    status: row.status,
    placeName: row.placeName,
    capacity: row.capacity,
    participantCount: row.participantCount,
    messageCount: row.messageCount,
    postCount: row.postCount,
    genderPreference: row.genderPreference,
    createdAt: row.createdAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    host: host
      ? {
          id: host.id,
          email: host.email,
          profile: host.profile
            ? {
                username: host.profile.username,
                displayName: host.profile.displayName,
                avatarUrl: storage.publicUrl(host.profile.avatarKey),
              }
            : null,
        }
      : null,
  };
}
