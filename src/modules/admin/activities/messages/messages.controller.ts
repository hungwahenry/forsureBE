import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CursorPaginationDto } from '../../../../common/dto/pagination.dto';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { AdminActivityMessagesService } from './messages.service';

@ApiTags('Admin / Activities')
@ApiBearerAuth()
@Controller('admin/activities/:id/messages')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminActivityMessagesController {
  constructor(private readonly service: AdminActivityMessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Chat messages in this activity.' })
  list(@Param('id') id: string, @Query() query: CursorPaginationDto) {
    return this.service.list(id, query);
  }
}
