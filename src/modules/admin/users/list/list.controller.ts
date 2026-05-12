import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { ListUsersDto } from './dto/list-users.dto';
import { AdminUsersListService } from './list.service';

@ApiTags('Admin / Users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminUsersListController {
  constructor(private readonly service: AdminUsersListService) {}

  @Get()
  @ApiOperation({
    summary: 'List users with search, filter, and cursor pagination.',
  })
  list(@Query() query: ListUsersDto) {
    return this.service.list(query);
  }
}
