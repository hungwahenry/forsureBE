import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../shared/admin.guard';
import { AdminOverviewService } from './overview.service';

@ApiTags('Admin / Overview')
@ApiBearerAuth()
@Controller('admin/overview')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminOverviewController {
  constructor(private readonly service: AdminOverviewService) {}

  @Get()
  @ApiOperation({
    summary:
      'Dashboard snapshot: top metrics, queue health, recent admin actions, and 30-day signup growth.',
  })
  get() {
    return this.service.get();
  }
}
