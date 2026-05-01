export interface FeedRow {
  id: string;
  emoji: string;
  title: string;
  startsAt: Date;
  placeName: string;
  placeLat: number;
  placeLng: number;
  capacity: number;
  hostUserId: string;
  participantCount: number;
  distanceKm: number;
  bucket: number;
  hostUsername: string;
  hostDisplayName: string;
  hostAvatarKey: string;
  participantAvatarKeys: string[] | null;
  genderPreference: 'ALL' | 'MALE' | 'FEMALE';
}

export interface FeedItem {
  id: string;
  emoji: string;
  title: string;
  startsAt: string;
  place: { name: string; lat: number; lng: number };
  capacity: number;
  genderPreference: 'ALL' | 'MALE' | 'FEMALE';
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
}
