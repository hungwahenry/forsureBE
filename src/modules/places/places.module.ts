import { Module } from '@nestjs/common';
import { BusinessSuggestionsController } from './business-suggestions/business-suggestions.controller';
import { BusinessSuggestionsService } from './business-suggestions/business-suggestions.service';
import { GooglePlacesClient } from './places.client';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';

@Module({
  controllers: [PlacesController, BusinessSuggestionsController],
  providers: [GooglePlacesClient, PlacesService, BusinessSuggestionsService],
})
export class PlacesModule {}
