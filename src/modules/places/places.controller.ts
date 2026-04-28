import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RetrievePlaceDto } from './dto/retrieve.dto';
import { SuggestPlacesDto } from './dto/suggest.dto';
import { PlacesService } from './places.service';

@ApiTags('places')
@ApiBearerAuth()
@Controller('places')
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get('suggest')
  @ApiOperation({
    summary:
      'Type-ahead place suggestions. Pass the same sessionToken across all suggest calls + the final retrieve.',
  })
  suggest(@Query() dto: SuggestPlacesDto) {
    return this.places.suggest(dto);
  }

  @Get('retrieve/:id')
  @ApiOperation({
    summary:
      'Fetch full place details (lat, lng, address) for a suggestion id. Closes the billing session.',
  })
  retrieve(@Param('id') id: string, @Query() dto: RetrievePlaceDto) {
    return this.places.retrieve(id, dto);
  }
}
