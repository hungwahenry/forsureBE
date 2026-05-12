import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { AdminUsersDetailService } from './detail.service';

@ApiTags('Admin / Users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminUsersDetailController {
  constructor(private readonly service: AdminUsersDetailService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Fetch full detail for a user.' })
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }
}
