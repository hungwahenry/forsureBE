import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../../common/decorators/current-user.decorator';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { ListQueueJobsDto } from './dto/list-jobs.dto';
import { AdminQueuesService } from './queues.service';

@ApiTags('Admin / System / Queues')
@ApiBearerAuth()
@Controller('admin/system/queues')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminQueuesController {
  constructor(private readonly service: AdminQueuesService) {}

  @Get()
  @ApiOperation({ summary: 'Summary of every BullMQ queue with state counts.' })
  list() {
    return this.service.listQueues();
  }

  @Get(':name/jobs')
  @ApiOperation({
    summary: 'List jobs in a queue filtered by state (default: failed).',
  })
  listJobs(@Param('name') name: string, @Query() query: ListQueueJobsDto) {
    return this.service.listJobs(name, query);
  }

  @Post(':name/jobs/:jobId/retry')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Retry a failed job. Audit-logged.' })
  async retry(
    @Param('name') name: string,
    @Param('jobId') jobId: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.retryJob(name, jobId, {
      adminId: admin.id,
      request: req,
    });
  }
}
