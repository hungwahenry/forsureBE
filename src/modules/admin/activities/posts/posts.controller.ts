import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CursorPaginationDto } from '../../../../common/dto/pagination.dto';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { AdminActivityPostsService } from './posts.service';

@ApiTags('Admin / Activities')
@ApiBearerAuth()
@Controller('admin/activities/:id/posts')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminActivityPostsController {
  constructor(private readonly service: AdminActivityPostsService) {}

  @Get()
  @ApiOperation({ summary: 'Memory posts in this activity.' })
  list(@Param('id') id: string, @Query() query: CursorPaginationDto) {
    return this.service.list(id, query);
  }
}
