import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { AdminBusinessVenuesService } from './venues.service';

@ApiTags('Admin / Businesses')
@ApiBearerAuth()
@Controller('admin/businesses/:id/venues')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminBusinessVenuesController {
  constructor(private readonly service: AdminBusinessVenuesService) {}

  @Get()
  @ApiOperation({ summary: "Venues registered by the business." })
  list(@Param('id') id: string) {
    return this.service.list(id);
  }
}
