import type { ActivityGenderPreference } from '@prisma/client';
import type { StorageProvider } from '../../storage/storage.interface';
import type { FeedRow } from './feed.interface';

export interface FeedItemBoost {
  businessId: string;
  businessName: string;
  businessLogoUrl: string | null;
}

export interface FeedItem {
  id: string;
  emoji: string;
  title: string;
  startsAt: string;
  place: { name: string; lat: number; lng: number };
  capacity: number;
  genderPreference: ActivityGenderPreference;
  spotsLeft: number;
  distanceKm: number;
  host: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  participantAvatarUrls: string[];
  goingCount: number;
  /** Set when this slot was filled by an active ActivityBoost. */
  boost: FeedItemBoost | null;
}

export function serializeFeedItem(
  storage: StorageProvider,
  r: FeedRow,
): FeedItem {
  const participantCount = Number(r.participantCount);
  return {
    id: r.id,
    emoji: r.emoji,
    title: r.title,
    startsAt: r.startsAt.toISOString(),
    place: { name: r.placeName, lat: r.placeLat, lng: r.placeLng },
    capacity: r.capacity,
    genderPreference: r.genderPreference,
    spotsLeft: r.capacity - participantCount,
    distanceKm: Number(r.distanceKm),
    host: {
      id: r.hostUserId,
      username: r.hostUsername,
      displayName: r.hostDisplayName,
      avatarUrl: storage.publicUrl(r.hostAvatarKey),
    },
    participantAvatarUrls: (r.participantAvatarKeys ?? []).map((key) =>
      storage.publicUrl(key),
    ),
    goingCount: participantCount,
    boost: r.boost
      ? {
          businessId: r.boost.businessId,
          businessName: r.boost.businessName,
          businessLogoUrl: r.boost.businessLogoKey
            ? storage.publicUrl(r.boost.businessLogoKey)
            : null,
        }
      : null,
  };
}
