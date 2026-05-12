import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { ListPostsDto } from './dto/list-posts.dto';
import { AdminPostsListService } from './list.service';

@ApiTags('Admin / Posts')
@ApiBearerAuth()
@Controller('admin/posts')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminPostsListController {
  constructor(private readonly service: AdminPostsListService) {}

  @Get()
  @ApiOperation({
    summary:
      'List memory posts with caption search, visibility / author / activity / deleted filters.',
  })
  list(@Query() query: ListPostsDto) {
    return this.service.list(query);
  }
}
