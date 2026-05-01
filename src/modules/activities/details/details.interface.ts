import type { ActivityGenderPreference, ActivityStatus } from '@prisma/client';
import type { ChatMessageDto } from '../../chats/chats.interface';

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
  host: ActivityParticipantDto;
  members: ActivityParticipantDto[];
  pinnedMessage: ChatMessageDto | null;
}
