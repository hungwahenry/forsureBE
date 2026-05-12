import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { ListBlocksDto } from './dto/list-blocks.dto';
import { AdminBlocksListService } from './list.service';

@ApiTags('Admin / Blocks')
@ApiBearerAuth()
@Controller('admin/blocks')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminBlocksListController {
  constructor(private readonly service: AdminBlocksListService) {}

  @Get()
  @ApiOperation({
    summary:
      'List user-to-user blocks platform-wide, with search across either side.',
  })
  list(@Query() query: ListBlocksDto) {
    return this.service.list(query);
  }
}
