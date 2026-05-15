import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../../shared/admin.guard';
import { AdminCronDetailService } from './detail.service';

@ApiTags('Admin / System / Cron')
@ApiBearerAuth()
@Controller('admin/system/cron/runs')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminCronDetailController {
  constructor(private readonly service: AdminCronDetailService) {}

  @Get(':id')
  @ApiOperation({
    summary:
      'Fetch a single cron run with full error stack and result payload.',
  })
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }
}
