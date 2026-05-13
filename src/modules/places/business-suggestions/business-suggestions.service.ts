import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../storage/storage.interface';
import { findVenueSuggestions } from './business-suggestions.queries';
import {
  serializeBusinessVenueSuggestion,
  type BusinessVenueSuggestionDto,
} from './business-suggestions.serializer';
import type { GetBusinessSuggestionsDto } from './dto/get-business-suggestions.dto';

const MAX_SUGGESTIONS = 3;

@Injectable()
export class BusinessSuggestionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async list(
    dto: GetBusinessSuggestionsDto,
  ): Promise<BusinessVenueSuggestionDto[]> {
    const rows = await findVenueSuggestions(this.prisma, {
      lat: dto.lat,
      lng: dto.lng,
      q: dto.q ?? '',
      limit: MAX_SUGGESTIONS,
    });
    return rows.map((row) => serializeBusinessVenueSuggestion(this.storage, row));
  }
}
