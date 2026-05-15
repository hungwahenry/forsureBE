import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { AdminConfigListService } from './list.service';

@ApiTags('Admin / Config')
@ApiBearerAuth()
@Controller('admin/config')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminConfigListController {
  constructor(private readonly service: AdminConfigListService) {}

  @Get()
  @ApiOperation({ summary: 'List every tunable config parameter.' })
  list() {
    return this.service.list();
  }
}
