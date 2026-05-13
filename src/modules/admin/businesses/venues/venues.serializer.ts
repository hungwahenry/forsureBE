import type { BusinessVenue } from '@prisma/client';

export interface AdminBusinessVenueItem {
  id: string;
  placeName: string;
  googlePlaceId: string | null;
  matchingKeywords: string[];
  maxRadiusM: number;
  isPaused: boolean;
  dailyBudgetCents: number;
  dailyBudgetRemaining: number;
  placeLat: number;
  placeLng: number;
  createdAt: string;
}

export function serializeAdminBusinessVenue(
  row: BusinessVenue,
): AdminBusinessVenueItem {
  return {
    id: row.id,
    placeName: row.placeName,
    googlePlaceId: row.googlePlaceId,
    matchingKeywords: row.matchingKeywords,
    maxRadiusM: row.maxRadiusM,
    isPaused: row.isPaused,
    dailyBudgetCents: row.dailyBudgetCents,
    dailyBudgetRemaining: row.dailyBudgetRemaining,
    placeLat: row.placeLat,
    placeLng: row.placeLng,
    createdAt: row.createdAt.toISOString(),
  };
}
