import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { AdminActivitiesDetailService } from './detail.service';

@ApiTags('Admin / Activities')
@ApiBearerAuth()
@Controller('admin/activities')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminActivitiesDetailController {
  constructor(private readonly service: AdminActivitiesDetailService) {}

  @Get(':id')
  @ApiOperation({
    summary:
      'Fetch full activity detail with host, counts, and admin-deletion metadata.',
  })
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }
}
