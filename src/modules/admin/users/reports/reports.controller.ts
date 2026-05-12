import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { ListUserReportsDto } from './dto/list-user-reports.dto';
import { AdminUserReportsService } from './reports.service';

@ApiTags('Admin / Users')
@ApiBearerAuth()
@Controller('admin/users/:id/reports')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminUserReportsController {
  constructor(private readonly service: AdminUserReportsService) {}

  @Get()
  @ApiOperation({
    summary: 'Reports filed by, or filed against, this user.',
  })
  list(@Param('id') id: string, @Query() query: ListUserReportsDto) {
    return this.service.list(id, query);
  }
}
