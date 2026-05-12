import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { AdminReportsDetailService } from './detail.service';

@ApiTags('Admin / Reports')
@ApiBearerAuth()
@Controller('admin/reports')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminReportsDetailController {
  constructor(private readonly service: AdminReportsDetailService) {}

  @Get(':id')
  @ApiOperation({
    summary:
      'Fetch a report with embedded target content (user / activity / message / post).',
  })
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }
}
