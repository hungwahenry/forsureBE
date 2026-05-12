import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { ListActivitiesDto } from './dto/list-activities.dto';
import { AdminActivitiesListService } from './list.service';

@ApiTags('Admin / Activities')
@ApiBearerAuth()
@Controller('admin/activities')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminActivitiesListController {
  constructor(private readonly service: AdminActivitiesListService) {}

  @Get()
  @ApiOperation({
    summary:
      'List activities with title search, status, host, date range, and deleted filters.',
  })
  list(@Query() query: ListActivitiesDto) {
    return this.service.list(query);
  }
}
