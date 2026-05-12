import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { ListUserActivitiesDto } from './dto/list-user-activities.dto';
import { AdminUserActivitiesService } from './activities.service';

@ApiTags('Admin / Users')
@ApiBearerAuth()
@Controller('admin/users/:id/activities')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminUserActivitiesController {
  constructor(private readonly service: AdminUserActivitiesService) {}

  @Get()
  @ApiOperation({
    summary: 'List activities a user has hosted or joined.',
  })
  list(@Param('id') id: string, @Query() query: ListUserActivitiesDto) {
    return this.service.list(id, query);
  }
}
