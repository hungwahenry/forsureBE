import type { BusinessVenue } from '@prisma/client';

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
  createdAt: string;
  updatedAt: string;
}

export function serializeBusinessVenue(row: BusinessVenue): BusinessVenueDto {
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
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
