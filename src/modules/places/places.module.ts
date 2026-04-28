import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import { PlacesController } from './places.controller';
import { PLACE_SEARCH_PROVIDER_TOKEN } from './places.interface';
import { PlacesService } from './places.service';
import { GooglePlaceSearchProvider } from './providers/google.provider';
import { MapboxPlaceSearchProvider } from './providers/mapbox.provider';

@Module({
  controllers: [PlacesController],
  providers: [
    MapboxPlaceSearchProvider,
    GooglePlaceSearchProvider,
    PlacesService,
    {
      provide: PLACE_SEARCH_PROVIDER_TOKEN,
      inject: [
        ConfigService,
        MapboxPlaceSearchProvider,
        GooglePlaceSearchProvider,
      ],
      useFactory: (
        config: ConfigService<Env, true>,
        mapbox: MapboxPlaceSearchProvider,
        google: GooglePlaceSearchProvider,
      ) =>
        config.get('PLACES_PROVIDER', { infer: true }) === 'google'
          ? google
          : mapbox,
    },
  ],
})
export class PlacesModule {}
