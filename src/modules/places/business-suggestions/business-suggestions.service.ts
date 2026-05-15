import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../common/app-config/app-config.service';
import { ErrorCode } from '../../../common/constants/error-codes';
import { FeatureFlagService } from '../../../common/feature-flags/feature-flag.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { createId } from '../../../common/utils/id';
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

@Injectable()
export class BusinessSuggestionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
    private readonly featureFlags: FeatureFlagService,
    private readonly appConfig: AppConfigService,
  ) {}

  async list(
    dto: GetBusinessSuggestionsDto,
  ): Promise<BusinessVenueSuggestionDto[]> {
    const enabled = await this.featureFlags.isEnabled(
      'business_venue_suggestions_enabled',
      true,
    );
    if (!enabled) return [];
    const rows = await findVenueSuggestions(this.prisma, {
      lat: dto.lat,
      lng: dto.lng,
      q: dto.q ?? '',
      limit: await this.appConfig.getInt('suggestions.max_results'),
    });
    return rows.map((row) =>
      serializeBusinessVenueSuggestion(this.storage, row),
    );
  }

  async recordPick(userId: string, venueId: string): Promise<void> {
    const venue = await this.prisma.businessVenue.findUnique({
      where: { id: venueId },
      select: { id: true },
    });
    if (!venue) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Venue not found.',
      });
    }
    await this.prisma.venueSuggestionEvent.create({
      data: {
        id: createId('vse'),
        venueId,
        userId,
        kind: 'PICK',
      },
    });
  }
}
