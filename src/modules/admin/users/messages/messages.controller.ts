import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CursorPaginationDto } from '../../../../common/dto/pagination.dto';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { AdminUserMessagesService } from './messages.service';

@ApiTags('Admin / Users')
@ApiBearerAuth()
@Controller('admin/users/:id/messages')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminUserMessagesController {
  constructor(private readonly service: AdminUserMessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Recent chat messages sent by the user.' })
  list(@Param('id') id: string, @Query() query: CursorPaginationDto) {
    return this.service.list(id, query);
  }
}
