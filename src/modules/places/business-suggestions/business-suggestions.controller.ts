import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';
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

  @Post(':venueId/pick')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Record that the user tapped a sponsored venue suggestion. Analytics-only — billing happens when the activity is created.',
  })
  async recordPick(
    @CurrentUser() user: AuthenticatedUser,
    @Param('venueId') venueId: string,
  ): Promise<void> {
    await this.service.recordPick(user.id, venueId);
  }
}
