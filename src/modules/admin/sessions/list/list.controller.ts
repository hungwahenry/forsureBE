import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { ListSessionsDto } from './dto/list-sessions.dto';
import { AdminSessionsListService } from './list.service';

@ApiTags('Admin / Sessions')
@ApiBearerAuth()
@Controller('admin/sessions')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminSessionsListController {
  constructor(private readonly service: AdminSessionsListService) {}

  @Get()
  @ApiOperation({
    summary:
      'List refresh-token sessions across all users, filterable by status / user / IP.',
  })
  list(@Query() query: ListSessionsDto) {
    return this.service.list(query);
  }
}
