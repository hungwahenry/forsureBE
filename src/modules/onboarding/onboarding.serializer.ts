import type { Gender, Profile } from '@prisma/client';
import type { StorageProvider } from '../../storage/storage.interface';

export interface AvatarUploadDto {
  key: string;
  url: string;
}

export function serializeAvatarUpload(
  storage: StorageProvider,
  key: string,
): AvatarUploadDto {
  return { key, url: storage.publicUrl(key) };
}

export interface OnboardingProfileDto {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  dateOfBirth: string;
  gender: Gender;
  avatarKey: string;
  locationLat: number;
  locationLng: number;
  placeName: string;
  createdAt: string;
  updatedAt: string;
}

/** Clean profile shape for the onboarding-complete response — drops the
 *  denormalised activity counters and the PostGIS locationPoint column. */
export function serializeOnboardingProfile(p: Profile): OnboardingProfileDto {
  return {
    id: p.id,
    userId: p.userId,
    username: p.username,
    displayName: p.displayName,
    dateOfBirth: p.dateOfBirth.toISOString(),
    gender: p.gender,
    avatarKey: p.avatarKey,
    locationLat: p.locationLat,
    locationLng: p.locationLng,
    placeName: p.placeName,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
