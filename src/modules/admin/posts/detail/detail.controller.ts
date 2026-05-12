import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { AdminPostsDetailService } from './detail.service';

@ApiTags('Admin / Posts')
@ApiBearerAuth()
@Controller('admin/posts')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminPostsDetailController {
  constructor(private readonly service: AdminPostsDetailService) {}

  @Get(':id')
  @ApiOperation({
    summary:
      'Fetch full post detail with photos, author, activity, and deletion metadata.',
  })
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }
}
