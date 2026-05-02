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

