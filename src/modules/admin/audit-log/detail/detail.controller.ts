import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { AdminAuditLogDetailService } from './detail.service';

@ApiTags('Admin / Audit log')
@ApiBearerAuth()
@Controller('admin/audit-log')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminAuditLogDetailController {
  constructor(private readonly service: AdminAuditLogDetailService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Fetch a single audit log entry with full before / after JSON.',
  })
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }
}
