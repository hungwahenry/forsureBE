import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CursorPaginationDto } from '../../../../common/dto/pagination.dto';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { AdminActivityReportsService } from './reports.service';

@ApiTags('Admin / Activities')
@ApiBearerAuth()
@Controller('admin/activities/:id/reports')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminActivityReportsController {
  constructor(private readonly service: AdminActivityReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Reports filed directly against this activity.' })
  list(@Param('id') id: string, @Query() query: CursorPaginationDto) {
    return this.service.list(id, query);
  }
}
