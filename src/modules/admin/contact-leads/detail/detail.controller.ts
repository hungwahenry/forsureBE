import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { AdminContactLeadsDetailService } from './detail.service';

@ApiTags('Admin / Contact leads')
@ApiBearerAuth()
@Controller('admin/contact-leads')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminContactLeadsDetailController {
  constructor(private readonly service: AdminContactLeadsDetailService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a single contact lead.' })
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }
}
