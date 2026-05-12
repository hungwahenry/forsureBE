import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { ListMessagesDto } from './dto/list-messages.dto';
import { AdminMessagesListService } from './list.service';

@ApiTags('Admin / Messages')
@ApiBearerAuth()
@Controller('admin/messages')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminMessagesListController {
  constructor(private readonly service: AdminMessagesListService) {}

  @Get()
  @ApiOperation({
    summary:
      'Search chat messages across rooms, with body / sender / activity / kind filters.',
  })
  list(@Query() query: ListMessagesDto) {
    return this.service.list(query);
  }
}
