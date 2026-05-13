import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { AdminBusinessesDetailService } from './detail.service';

@ApiTags('Admin / Businesses')
@ApiBearerAuth()
@Controller('admin/businesses')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminBusinessesDetailController {
  constructor(private readonly service: AdminBusinessesDetailService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Fetch full detail for a business.' })
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }
}
