import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import type { Env } from '../../config/env.schema';
import { RetrieveParams, SuggestParams } from './places.interface';
import {
  serializePlaceDetails,
  serializeSuggestion,
  type GoogleAutocompletePrediction,
  type GooglePlaceDetailsResponse,
  type PlaceDetails,
  type PlaceSuggestion,
} from './places.serializer';
import { placesFetch } from './utils/places-fetch';

const BASE_URL = 'https://places.googleapis.com/v1';

const AUTOCOMPLETE_FIELD_MASK = [
  'suggestions.placePrediction.placeId',
  'suggestions.placePrediction.structuredFormat',
  'suggestions.placePrediction.text',
  'suggestions.placePrediction.types',
].join(',');
const PLACE_DETAILS_FIELD_MASK = ['id', 'formattedAddress', 'location'].join(
  ',',
);

const PROXIMITY_RADIUS_METERS = 50_000;

interface GoogleAutocompleteResponse {
  suggestions?: Array<{ placePrediction?: GoogleAutocompletePrediction }>;
}

@Injectable()
export class GooglePlacesClient {
  private readonly logger = new Logger(GooglePlacesClient.name);
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

    const res = await placesFetch(`${BASE_URL}/places:autocomplete`, {
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
      .map((s) => serializeSuggestion(s.placePrediction))
      .filter((s): s is PlaceSuggestion => s !== null);
  }

  async retrieve(
    id: string,
    { sessionToken }: RetrieveParams,
  ): Promise<PlaceDetails> {
    const params = new URLSearchParams({ sessionToken });
    const res = await placesFetch(
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
    return serializePlaceDetails(id, data);
  }

  private async toError(res: Response, op: string): Promise<AppException> {
    const text = await res.text().catch(() => '');
    const isOperational =
      res.status >= 500 || res.status === 403 || res.status === 429;
    this.logger[isOperational ? 'warn' : 'error'](
      { status: res.status, body: text.slice(0, 500), op },
      'Google Places request failed',
    );
    if (res.status === 404) {
      return new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Place not found.',
      });
    }
    return new AppException(ErrorCode.INTERNAL_ERROR, {
      message: 'Place search is unavailable. Try again in a moment.',
    });
  }
}
