import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CursorPaginationDto } from '../../../../common/dto/pagination.dto';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { AdminUserSessionsService } from './sessions.service';

@ApiTags('Admin / Users')
@ApiBearerAuth()
@Controller('admin/users/:id/sessions')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminUserSessionsController {
  constructor(private readonly service: AdminUserSessionsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Refresh tokens for the user (active and revoked). Token values are never returned.',
  })
  list(@Param('id') id: string, @Query() query: CursorPaginationDto) {
    return this.service.list(id, query);
  }
}
