import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CursorPaginationDto } from '../../../../common/dto/pagination.dto';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { AdminActivityParticipantsService } from './participants.service';

@ApiTags('Admin / Activities')
@ApiBearerAuth()
@Controller('admin/activities/:id/participants')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminActivityParticipantsController {
  constructor(private readonly service: AdminActivityParticipantsService) {}

  @Get()
  @ApiOperation({ summary: 'List participants in an activity (HOST first).' })
  list(@Param('id') id: string, @Query() query: CursorPaginationDto) {
    return this.service.list(id, query);
  }
}
