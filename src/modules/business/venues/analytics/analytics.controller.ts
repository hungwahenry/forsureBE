import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { BusinessMemberGuard } from '../../shared/business-member.guard';
import {
  CurrentBusinessMember,
  type BusinessMemberContext,
} from '../../shared/current-business-member.decorator';
import { VenueAnalyticsService } from './analytics.service';

@ApiTags('Business / Venues')
@ApiBearerAuth()
@Controller('business/venues/:id/analytics')
@UseGuards(BusinessMemberGuard)
@SkipOnboarding()
export class VenueAnalyticsController {
  constructor(private readonly service: VenueAnalyticsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Last 30 days of picks, conversions, spend, and recent activities for a venue.',
  })
  get(
    @CurrentBusinessMember() member: BusinessMemberContext,
    @Param('id') id: string,
  ) {
    return this.service.get(member.businessId, id);
  }
}
