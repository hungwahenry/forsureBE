import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../common/decorators/skip-onboarding.decorator';
import { BusinessMemberGuard } from '../shared/business-member.guard';
import {
  CurrentBusinessMember,
  type BusinessMemberContext,
} from '../shared/current-business-member.decorator';
import { BusinessOverviewService } from './overview.service';

@ApiTags('Business / Overview')
@ApiBearerAuth()
@Controller('business/overview')
@UseGuards(BusinessMemberGuard)
@SkipOnboarding()
export class BusinessOverviewController {
  constructor(private readonly service: BusinessOverviewService) {}

  @Get()
  @ApiOperation({
    summary:
      'At-a-glance overview for the dashboard: venues count, live boosts, venue picks last 30d.',
  })
  get(@CurrentBusinessMember() member: BusinessMemberContext) {
    return this.service.get(member.businessId);
  }
}
