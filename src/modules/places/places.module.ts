import { Module } from '@nestjs/common';
import { GooglePlacesClient } from './places.client';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';

@Module({
  controllers: [PlacesController],
  providers: [GooglePlacesClient, PlacesService],
})
export class PlacesModule {}
