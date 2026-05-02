import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';

export interface PlaceSuggestion {
  id: string;
  name: string;
  description: string;
}

export interface PlaceDetails {
  id: string;
  name?: string;
  address: string;
  lat: number;
  lng: number;
}

export interface GoogleAutocompletePrediction {
  placeId?: string;
  text?: { text?: string };
  structuredFormat?: {
    mainText?: { text?: string };
    secondaryText?: { text?: string };
  };
  types?: string[];
}

export interface GooglePlaceDetailsResponse {
  id?: string;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
}

export function serializeSuggestion(
  prediction: GoogleAutocompletePrediction | undefined,
): PlaceSuggestion | null {
  if (!prediction?.placeId) return null;
  if (!prediction.types?.includes('establishment')) return null;
  return {
    id: prediction.placeId,
    name:
      prediction.structuredFormat?.mainText?.text ??
      prediction.text?.text ??
      '',
    description: prediction.structuredFormat?.secondaryText?.text ?? '',
  };
}

export function serializePlaceDetails(
  fallbackId: string,
  data: GooglePlaceDetailsResponse,
): PlaceDetails {
  if (!data.location) {
    throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
      message: 'Place not found.',
    });
  }
  return {
    id: data.id ?? fallbackId,
    address: data.formattedAddress ?? '',
    lat: data.location.latitude,
    lng: data.location.longitude,
  };
}
