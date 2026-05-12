import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { ListUserBlocksDto } from './dto/list-user-blocks.dto';
import { AdminUserBlocksService } from './blocks.service';

@ApiTags('Admin / Users')
@ApiBearerAuth()
@Controller('admin/users/:id/blocks')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminUserBlocksController {
  constructor(private readonly service: AdminUserBlocksService) {}

  @Get()
  @ApiOperation({
    summary: 'Block relationships either issued by or against this user.',
  })
  list(@Param('id') id: string, @Query() query: ListUserBlocksDto) {
    return this.service.list(id, query);
  }
}
