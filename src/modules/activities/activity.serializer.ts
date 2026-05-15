import type {
  Activity,
  ActivityGenderPreference,
  ActivityStatus,
} from '@prisma/client';

export interface ActivitySummaryDto {
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
  createdAt: string;
}

export function serializeActivitySummary(a: Activity): ActivitySummaryDto {
  return {
    id: a.id,
    emoji: a.emoji,
    title: a.title,
    startsAt: a.startsAt.toISOString(),
    place: { name: a.placeName, lat: a.placeLat, lng: a.placeLng },
    capacity: a.capacity,
    participantCount: a.participantCount,
    genderPreference: a.genderPreference,
    status: a.status,
    memoriesShareablePublicly: a.memoriesShareablePublicly,
    createdAt: a.createdAt.toISOString(),
  };
}
