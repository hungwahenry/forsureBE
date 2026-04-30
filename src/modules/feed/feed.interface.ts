/**
 * Raw row shape returned by the feed SQL query — internal to FeedService.
 */
export interface FeedRow {
  id: string;
  emoji: string;
  title: string;
  startsAt: Date;
  placeName: string;
  placeLat: number;
  placeLng: number;
  capacity: number;
  authorUserId: string;
  participantCount: number;
  distanceKm: number;
  bucket: number;
  hostUsername: string;
  hostDisplayName: string;
  hostAvatarKey: string;
  participantAvatarKeys: string[] | null;
  genderPreference: 'ALL' | 'MALE' | 'FEMALE';
}

/**
 * One row in the feed response. Shape is mirrored on the frontend.
 */
export interface FeedItem {
  id: string;
  emoji: string;
  title: string;
  /** ISO datetime string. */
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
  /** Up to 3 most-recent participant avatars (excludes host). Use with `goingCount` for stack + overflow. */
  participantAvatarUrls: string[];
  /** Total people going (host + participants). */
  goingCount: number;
  isOwn: boolean;
}
