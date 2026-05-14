import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { AdminBusinessesStatsService } from './stats.service';

@ApiTags('Admin / Businesses')
@ApiBearerAuth()
@Controller('admin/businesses/stats')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminBusinessesStatsController {
  constructor(private readonly service: AdminBusinessesStatsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Top-of-list ops stats: active subs, live boosts, picks last 30d, suspended + auto-paused counts.',
  })
  stats() {
    return this.service.stats();
  }
}
