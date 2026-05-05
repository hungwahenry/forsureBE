import type {
  Activity,
  ActivityGenderPreference,
  ActivityParticipant,
  ActivityRole,
  ActivityStatus,
  Profile,
  User,
} from '@prisma/client';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import type { StorageProvider } from '../../../storage/storage.interface';

const PARTICIPANT_AVATARS_LIMIT = 3;

type ParticipantWithUser = ActivityParticipant & {
  user: User & { profile: Profile | null };
};

export type ActivityWithParticipants = Activity & {
  participants: ParticipantWithUser[];
};

export interface ActivityPreviewHostDto {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

export interface ActivityPreviewDto {
  id: string;
  emoji: string;
  title: string;
  startsAt: string;
  place: { name: string; lat: number; lng: number };
  capacity: number;
  participantCount: number;
  genderPreference: ActivityGenderPreference;
  status: ActivityStatus;
  spotsLeft: number;
  host: ActivityPreviewHostDto;
  participantAvatarUrls: string[];
  viewerIsHost: boolean;
  viewerIsMember: boolean;
}

export function serializeActivityPreview(
  storage: StorageProvider,
  viewerId: string,
  activity: ActivityWithParticipants,
  blockedUserIds: Set<string>,
): ActivityPreviewDto {
  const host = activity.participants.find(
    (p) => p.role === ('HOST' satisfies ActivityRole),
  );
  if (!host?.user.profile) {
    throw new AppException(ErrorCode.INTERNAL_ERROR, {
      message: 'Activity is missing a host with a profile.',
    });
  }

  const members = activity.participants.filter(
    (p) => p.role === ('MEMBER' satisfies ActivityRole),
  );
  const participantCount = activity.participants.length;

  return {
    id: activity.id,
    emoji: activity.emoji,
    title: activity.title,
    startsAt: activity.startsAt.toISOString(),
    place: {
      name: activity.placeName,
      lat: activity.placeLat,
      lng: activity.placeLng,
    },
    capacity: activity.capacity,
    participantCount,
    genderPreference: activity.genderPreference,
    status: activity.status,
    spotsLeft: Math.max(0, activity.capacity - participantCount),
    host: {
      id: host.userId,
      username: host.user.profile.username,
      displayName: host.user.profile.displayName,
      avatarUrl: storage.publicUrl(host.user.profile.avatarKey),
    },
    participantAvatarUrls: members
      .filter((m) => !blockedUserIds.has(m.userId))
      .slice(0, PARTICIPANT_AVATARS_LIMIT)
      .filter((m): m is ParticipantWithUser & { user: { profile: Profile } } =>
        Boolean(m.user.profile),
      )
      .map((m) => storage.publicUrl(m.user.profile.avatarKey)),
    viewerIsHost: host.userId === viewerId,
    viewerIsMember: activity.participants.some((p) => p.userId === viewerId),
  };
}
