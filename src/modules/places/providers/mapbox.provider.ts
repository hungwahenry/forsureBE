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

const BASE_URL = 'https://api.mapbox.com/search/searchbox/v1';

interface MapboxSuggestion {
  name?: string;
  mapbox_id?: string;
  place_formatted?: string;
  full_address?: string;
}

interface MapboxRetrieveFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    full_address?: string;
    place_formatted?: string;
  };
}

@Injectable()
export class MapboxPlaceSearchProvider implements PlaceSearchProvider {
  private readonly logger = new Logger(MapboxPlaceSearchProvider.name);
  private readonly token: string;

  constructor(config: ConfigService<Env, true>) {
    this.token = config.get('MAPBOX_TOKEN', { infer: true })!;
  }

  async suggest({
    q,
    proximity,
    sessionToken,
  }: SuggestParams): Promise<PlaceSuggestion[]> {
    const params = new URLSearchParams({
      q,
      session_token: sessionToken,
      access_token: this.token,
      limit: '8',
    });
    if (proximity) {
      params.set('proximity', `${proximity.lng},${proximity.lat}`);
    }

    const res = await fetch(`${BASE_URL}/suggest?${params.toString()}`);
    if (!res.ok) throw await this.toError(res, 'suggest');

    const body = (await res.json()) as { suggestions?: MapboxSuggestion[] };
    return (body.suggestions ?? [])
      .filter((s): s is MapboxSuggestion & { mapbox_id: string } =>
        Boolean(s.mapbox_id),
      )
      .map((s) => ({
        id: s.mapbox_id,
        name: s.name ?? s.place_formatted ?? '',
        description: s.place_formatted ?? s.full_address ?? '',
      }));
  }

  async retrieve(
    id: string,
    { sessionToken }: RetrieveParams,
  ): Promise<PlaceDetails> {
    const params = new URLSearchParams({
      session_token: sessionToken,
      access_token: this.token,
    });
    const res = await fetch(
      `${BASE_URL}/retrieve/${encodeURIComponent(id)}?${params.toString()}`,
    );
    if (!res.ok) throw await this.toError(res, 'retrieve');

    const body = (await res.json()) as { features?: MapboxRetrieveFeature[] };
    const feature = body.features?.[0];
    if (!feature?.geometry?.coordinates || !feature.properties) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Place not found.',
      });
    }
    const [lng, lat] = feature.geometry.coordinates;
    return {
      id,
      name: feature.properties.name ?? '',
      address:
        feature.properties.full_address ??
        feature.properties.place_formatted ??
        '',
      lat,
      lng,
    };
  }

  private async toError(res: Response, op: string): Promise<AppException> {
    const text = await res.text().catch(() => '');
    this.logger.warn(
      { status: res.status, body: text.slice(0, 500), op },
      'Mapbox request failed',
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
