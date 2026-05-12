import type { Activity, Profile, User } from '@prisma/client';
import type { StorageProvider } from '../../../../storage/storage.interface';

interface UserBrief {
  id: string;
  email: string;
  profile: {
    username: string;
    displayName: string;
    avatarUrl: string;
  } | null;
}

export interface AdminActivityDetail {
  id: string;
  emoji: string;
  title: string;
  startsAt: string;
  status: Activity['status'];
  placeName: string;
  placeLat: number;
  placeLng: number;
  capacity: number;
  participantCount: number;
  messageCount: number;
  postCount: number;
  genderPreference: Activity['genderPreference'];
  memoriesShareablePublicly: boolean;
  createdAt: string;
  updatedAt: string;
  deletion: {
    deletedAt: string;
    deletedReason: string | null;
    deletedBy: { id: string; email: string } | null;
  } | null;
  host: UserBrief | null;
  counts: {
    activeReports: number;
    pinnedMessage: string | null;
  };
}

type HostRow = Pick<User, 'id' | 'email'> & {
  profile: Pick<Profile, 'username' | 'displayName' | 'avatarKey'> | null;
};

type ActivityRow = Activity & {
  participants: { user: HostRow }[];
  deletedBy: Pick<User, 'id' | 'email'> | null;
};

export function serializeAdminActivityDetail(
  storage: StorageProvider,
  row: ActivityRow,
  counts: { activeReports: number },
): AdminActivityDetail {
  const host = row.participants[0]?.user;
  return {
    id: row.id,
    emoji: row.emoji,
    title: row.title,
    startsAt: row.startsAt.toISOString(),
    status: row.status,
    placeName: row.placeName,
    placeLat: row.placeLat,
    placeLng: row.placeLng,
    capacity: row.capacity,
    participantCount: row.participantCount,
    messageCount: row.messageCount,
    postCount: row.postCount,
    genderPreference: row.genderPreference,
    memoriesShareablePublicly: row.memoriesShareablePublicly,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletion: row.deletedAt
      ? {
          deletedAt: row.deletedAt.toISOString(),
          deletedReason: row.deletedReason,
          deletedBy: row.deletedBy,
        }
      : null,
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
    counts: {
      activeReports: counts.activeReports,
      pinnedMessage: row.pinnedMessageId,
    },
  };
}
