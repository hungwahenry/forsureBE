import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { AdminFeatureFlagsListService } from './list.service';

@ApiTags('Admin / Feature flags')
@ApiBearerAuth()
@Controller('admin/feature-flags')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminFeatureFlagsListController {
  constructor(private readonly service: AdminFeatureFlagsListService) {}

  @Get()
  @ApiOperation({ summary: 'List all feature flags.' })
  list() {
    return this.service.list();
  }
}
