import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { ListReportsDto } from './dto/list-reports.dto';
import { AdminReportsListService } from './list.service';

@ApiTags('Admin / Reports')
@ApiBearerAuth()
@Controller('admin/reports')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminReportsListController {
  constructor(private readonly service: AdminReportsListService) {}

  @Get()
  @ApiOperation({
    summary: 'List reports with status / target type / reporter filters.',
  })
  list(@Query() query: ListReportsDto) {
    return this.service.list(query);
  }
}
