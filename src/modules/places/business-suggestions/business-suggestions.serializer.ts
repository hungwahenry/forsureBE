import type { StorageProvider } from '../../../storage/storage.interface';

export interface BusinessVenueSuggestionRow {
  venueId: string;
  placeName: string;
  placeLat: number;
  placeLng: number;
  distanceM: number;
  businessId: string;
  businessName: string;
  businessLogoKey: string | null;
}

export interface BusinessVenueSuggestionDto {
  venueId: string;
  placeName: string;
  placeLat: number;
  placeLng: number;
  distanceM: number;
  businessId: string;
  businessName: string;
  businessLogoUrl: string | null;
}

export function serializeBusinessVenueSuggestion(
  storage: StorageProvider,
  row: BusinessVenueSuggestionRow,
): BusinessVenueSuggestionDto {
  return {
    venueId: row.venueId,
    placeName: row.placeName,
    placeLat: row.placeLat,
    placeLng: row.placeLng,
    distanceM: Math.round(row.distanceM),
    businessId: row.businessId,
    businessName: row.businessName,
    businessLogoUrl: row.businessLogoKey
      ? storage.publicUrl(row.businessLogoKey)
      : null,
  };
}
