import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CursorPaginationDto } from '../../../../common/dto/pagination.dto';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { AdminUserPostsService } from './posts.service';

@ApiTags('Admin / Users')
@ApiBearerAuth()
@Controller('admin/users/:id/posts')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminUserPostsController {
  constructor(private readonly service: AdminUserPostsService) {}

  @Get()
  @ApiOperation({ summary: 'Memory posts authored by the user.' })
  list(@Param('id') id: string, @Query() query: CursorPaginationDto) {
    return this.service.list(id, query);
  }
}
