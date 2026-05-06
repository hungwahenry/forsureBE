import type {
  Activity,
  ActivityGenderPreference,
  ActivityParticipant,
  ActivityRole,
  ActivityStatus,
  ChatMessage,
  Profile,
  User,
} from '@prisma/client';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import type { StorageProvider } from '../../../storage/storage.interface';
import type { MessageWithRelations } from '../../chats/messages/messages.queries';
import {
  serializeMessage,
  type ChatMessageDto,
} from '../../chats/messages/messages.serializer';

export interface ActivityParticipantDto {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  joinedAt: string;
}

export interface ActivityDetailsDto {
  id: string;
  emoji: string;
  title: string;
  startsAt: string;
  place: { name: string; lat: number; lng: number };
  capacity: number;
  participantCount: number;
  genderPreference: ActivityGenderPreference;
  status: ActivityStatus;
  memoriesShareablePublicly: boolean;
  host: ActivityParticipantDto;
  members: ActivityParticipantDto[];
  pinnedMessage: ChatMessageDto | null;
  hmsRoomId: string | null;
}

type ParticipantWithUser = ActivityParticipant & {
  user: User & { profile: Profile | null };
};

export type ActivityWithRelations = Activity & {
  participants: ParticipantWithUser[];
  pinnedMessage: (ChatMessage & MessageWithRelations) | null;
};

export function serializeActivityDetails(
  storage: StorageProvider,
  activity: ActivityWithRelations,
): ActivityDetailsDto {
  const host = activity.participants.find(
    (p) => p.role === ('HOST' satisfies ActivityRole),
  );
  if (!host) {
    throw new AppException(ErrorCode.INTERNAL_ERROR, {
      message: 'Activity is missing a host participant.',
    });
  }
  const members = activity.participants.filter(
    (p) => p.role === ('MEMBER' satisfies ActivityRole),
  );

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
    participantCount: activity.participantCount,
    genderPreference: activity.genderPreference,
    status: activity.status,
    memoriesShareablePublicly: activity.memoriesShareablePublicly,
    host: serializeParticipant(storage, host),
    members: members.map((m) => serializeParticipant(storage, m)),
    pinnedMessage: activity.pinnedMessage
      ? serializeMessage(storage, activity.pinnedMessage)
      : null,
    hmsRoomId: activity.hmsRoomId ?? null,
  };
}

function serializeParticipant(
  storage: StorageProvider,
  p: ParticipantWithUser,
): ActivityParticipantDto {
  if (!p.user.profile) {
    throw new AppException(ErrorCode.INTERNAL_ERROR, {
      message: 'Participant is missing a profile.',
    });
  }
  return {
    userId: p.userId,
    username: p.user.profile.username,
    displayName: p.user.profile.displayName,
    avatarUrl: storage.publicUrl(p.user.profile.avatarKey),
    joinedAt: p.joinedAt.toISOString(),
  };
}
