import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { ListAuditLogDto } from './dto/list-audit-log.dto';
import { AdminAuditLogListService } from './list.service';

@ApiTags('Admin / Audit log')
@ApiBearerAuth()
@Controller('admin/audit-log')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminAuditLogListController {
  constructor(private readonly service: AdminAuditLogListService) {}

  @Get()
  @ApiOperation({
    summary:
      'List admin audit log entries with filters: admin / action / target / date range.',
  })
  list(@Query() query: ListAuditLogDto) {
    return this.service.list(query);
  }

  @Get('actions')
  @ApiOperation({
    summary:
      'Distinct action codes that have ever appeared (for filter dropdown).',
  })
  async actions(): Promise<{ items: string[] }> {
    const items = await this.service.listDistinctActions();
    return { items };
  }

  @Get('target-types')
  @ApiOperation({
    summary:
      'Distinct target types that have ever appeared (for filter dropdown).',
  })
  async targetTypes(): Promise<{ items: string[] }> {
    const items = await this.service.listDistinctTargetTypes();
    return { items };
  }
}
