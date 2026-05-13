import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessSuggestionsService } from './business-suggestions.service';
import { GetBusinessSuggestionsDto } from './dto/get-business-suggestions.dto';

@ApiTags('Places')
@ApiBearerAuth()
@Controller('places/business-suggestions')
export class BusinessSuggestionsController {
  constructor(private readonly service: BusinessSuggestionsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Up to 3 nearby verified-business venues for the mobile place picker. Filtered by radius + keyword overlap, ordered by distance.',
  })
  list(@Query() dto: GetBusinessSuggestionsDto) {
    return this.service.list(dto);
  }
}
