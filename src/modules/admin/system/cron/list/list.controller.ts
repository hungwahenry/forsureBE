import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../../shared/admin.guard';
import { ListCronRunsDto } from './dto/list-cron-runs.dto';
import { AdminCronListService } from './list.service';

@ApiTags('Admin / System / Cron')
@ApiBearerAuth()
@Controller('admin/system/cron')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminCronListController {
  constructor(private readonly service: AdminCronListService) {}

  @Get('jobs')
  @ApiOperation({
    summary: 'List distinct job names that have ever run.',
  })
  async jobs(): Promise<{ items: string[] }> {
    const items = await this.service.listJobNames();
    return { items };
  }

  @Get('runs')
  @ApiOperation({
    summary: 'List cron job runs filterable by job name / status.',
  })
  list(@Query() query: ListCronRunsDto) {
    return this.service.list(query);
  }
}
