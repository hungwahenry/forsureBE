import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import type { Env } from '../../../config/env.schema';
import {
  PlaceDetails,
  PlaceSearchProvider,
  PlaceSuggestion,
  RetrieveParams,
  SuggestParams,
} from '../places.interface';

const BASE_URL = 'https://places.googleapis.com/v1';

const AUTOCOMPLETE_FIELD_MASK = [
  'suggestions.placePrediction.placeId',
  'suggestions.placePrediction.structuredFormat',
  'suggestions.placePrediction.text',
  // Free at Essentials tier — we use it to drop non-venue results
  // (neighborhoods, countries, addresses) before returning to the client.
  'suggestions.placePrediction.types',
].join(',');
const PLACE_DETAILS_FIELD_MASK = ['id', 'formattedAddress', 'location'].join(
  ',',
);

const PROXIMITY_RADIUS_METERS = 50_000;

interface GoogleAutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
      types?: string[];
    };
  }>;
}

interface GooglePlaceDetailsResponse {
  id?: string;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
}

@Injectable()
export class GooglePlaceSearchProvider implements PlaceSearchProvider {
  private readonly logger = new Logger(GooglePlaceSearchProvider.name);
  private readonly apiKey: string;

  constructor(config: ConfigService<Env, true>) {
    this.apiKey = config.get('GOOGLE_PLACES_API_KEY', { infer: true })!;
  }

  async suggest({
    q,
    proximity,
    sessionToken,
  }: SuggestParams): Promise<PlaceSuggestion[]> {
    const body: Record<string, unknown> = { input: q, sessionToken };
    if (proximity) {
      body.locationBias = {
        circle: {
          center: { latitude: proximity.lat, longitude: proximity.lng },
          radius: PROXIMITY_RADIUS_METERS,
        },
      };
    }

    const res = await fetch(`${BASE_URL}/places:autocomplete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': AUTOCOMPLETE_FIELD_MASK,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await this.toError(res, 'suggest');

    const data = (await res.json()) as GoogleAutocompleteResponse;
    return (data.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> & { placeId: string } =>
        // Keep only real venues — `establishment` is Google's umbrella tag
        // for businesses / POIs (restaurants, parks, gyms, cinemas, ...).
        // Drops neighborhoods, sublocalities, addresses, regions, countries.
        Boolean(p?.placeId) && (p?.types?.includes('establishment') ?? false),
      )
      .map((p) => ({
        id: p.placeId,
        name: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
        description: p.structuredFormat?.secondaryText?.text ?? '',
      }));
  }

  async retrieve(
    id: string,
    { sessionToken }: RetrieveParams,
  ): Promise<PlaceDetails> {
    const params = new URLSearchParams({ sessionToken });
    const res = await fetch(
      `${BASE_URL}/places/${encodeURIComponent(id)}?${params.toString()}`,
      {
        headers: {
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': PLACE_DETAILS_FIELD_MASK,
        },
      },
    );
    if (!res.ok) throw await this.toError(res, 'retrieve');

    const data = (await res.json()) as GooglePlaceDetailsResponse;
    if (!data.location) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Place not found.',
      });
    }
    return {
      id: data.id ?? id,
      // Google: name intentionally not requested (Pro tier). Frontend uses
      // the suggestion's name as the canonical display value.
      address: data.formattedAddress ?? '',
      lat: data.location.latitude,
      lng: data.location.longitude,
    };
  }

  private async toError(res: Response, op: string): Promise<AppException> {
    const text = await res.text().catch(() => '');
    this.logger.warn(
      { status: res.status, body: text.slice(0, 500), op },
      'Google Places request failed',
    );
    if (res.status === 404) {
      return new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Place not found.',
      });
    }
    if (res.status >= 500) {
      return new AppException(ErrorCode.INTERNAL_ERROR, {
        message: 'Place search is unavailable. Try again in a moment.',
      });
    }
    return new AppException(ErrorCode.VALIDATION_FAILED, {
      message: 'Place lookup failed.',
    });
  }
}
