import type { BusinessVenue, BusinessVenuePhoto } from '@prisma/client';
import type { StorageProvider } from '../../../storage/storage.interface';

export interface BusinessVenuePhotoDto {
  id: string;
  url: string;
  sortOrder: number;
}

export interface BusinessVenueDto {
  id: string;
  placeName: string;
  placeLat: number;
  placeLng: number;
  googlePlaceId: string | null;
  matchingKeywords: string[];
  maxRadiusM: number;
  isPaused: boolean;
  dailyBudgetCents: number;
  dailyBudgetRemaining: number;
  phoneNumber: string | null;
  websiteUrl: string | null;
  photos: BusinessVenuePhotoDto[];
  createdAt: string;
  updatedAt: string;
}

type VenueWithPhotos = BusinessVenue & { photos: BusinessVenuePhoto[] };

export function serializeBusinessVenuePhoto(
  storage: StorageProvider,
  row: BusinessVenuePhoto,
): BusinessVenuePhotoDto {
  return {
    id: row.id,
    url: storage.publicUrl(row.imageKey),
    sortOrder: row.sortOrder,
  };
}

export function serializeBusinessVenue(
  storage: StorageProvider,
  row: VenueWithPhotos,
): BusinessVenueDto {
  const sortedPhotos = [...row.photos].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  return {
    id: row.id,
    placeName: row.placeName,
    placeLat: row.placeLat,
    placeLng: row.placeLng,
    googlePlaceId: row.googlePlaceId,
    matchingKeywords: row.matchingKeywords,
    maxRadiusM: row.maxRadiusM,
    isPaused: row.isPaused,
    dailyBudgetCents: row.dailyBudgetCents,
    dailyBudgetRemaining: row.dailyBudgetRemaining,
    phoneNumber: row.phoneNumber,
    websiteUrl: row.websiteUrl,
    photos: sortedPhotos.map((p) => serializeBusinessVenuePhoto(storage, p)),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
