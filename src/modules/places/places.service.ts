import { Injectable } from '@nestjs/common';
import { RetrievePlaceDto } from './dto/retrieve.dto';
import { SuggestPlacesDto } from './dto/suggest.dto';
import type { PlaceDetails, PlaceSuggestion } from './places.interface';
import { GooglePlacesClient } from './places.client';

@Injectable()
export class PlacesService {
  constructor(private readonly google: GooglePlacesClient) {}

  suggest(dto: SuggestPlacesDto): Promise<PlaceSuggestion[]> {
    return this.google.suggest({
      q: dto.q,
      sessionToken: dto.sessionToken,
      proximity:
        dto.lat !== undefined && dto.lng !== undefined
          ? { lat: dto.lat, lng: dto.lng }
          : undefined,
    });
  }

  retrieve(id: string, dto: RetrievePlaceDto): Promise<PlaceDetails> {
    return this.google.retrieve(id, { sessionToken: dto.sessionToken });
  }
}
