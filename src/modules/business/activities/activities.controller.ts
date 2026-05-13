import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';
import { SkipOnboarding } from '../../../common/decorators/skip-onboarding.decorator';
import { BusinessMemberGuard } from '../shared/business-member.guard';
import { BusinessActivitiesService } from './activities.service';

@ApiTags('Business / Activities')
@ApiBearerAuth()
@Controller('business/activities')
@UseGuards(BusinessMemberGuard)
@SkipOnboarding()
export class BusinessActivitiesController {
  constructor(private readonly service: BusinessActivitiesService) {}

  @Get()
  @ApiOperation({
    summary:
      "Activities hosted by the caller, with each one's currently-running boost (if any).",
  })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      "Detail view of a hosted activity: full boost history + campaign analytics.",
  })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.get(user.id, id);
  }
}
