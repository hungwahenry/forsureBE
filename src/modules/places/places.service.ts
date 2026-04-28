import { Inject, Injectable } from '@nestjs/common';
import { RetrievePlaceDto } from './dto/retrieve.dto';
import { SuggestPlacesDto } from './dto/suggest.dto';
import { PLACE_SEARCH_PROVIDER_TOKEN } from './places.interface';
import type {
  PlaceDetails,
  PlaceSearchProvider,
  PlaceSuggestion,
} from './places.interface';

@Injectable()
export class PlacesService {
  constructor(
    @Inject(PLACE_SEARCH_PROVIDER_TOKEN)
    private readonly provider: PlaceSearchProvider,
  ) {}

  suggest(dto: SuggestPlacesDto): Promise<PlaceSuggestion[]> {
    return this.provider.suggest({
      q: dto.q,
      sessionToken: dto.sessionToken,
      proximity:
        dto.lat !== undefined && dto.lng !== undefined
          ? { lat: dto.lat, lng: dto.lng }
          : undefined,
    });
  }

  retrieve(id: string, dto: RetrievePlaceDto): Promise<PlaceDetails> {
    return this.provider.retrieve(id, { sessionToken: dto.sessionToken });
  }
}
