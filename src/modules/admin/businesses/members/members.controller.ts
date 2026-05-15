import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { AdminBusinessMembersService } from './members.service';

@ApiTags('Admin / Businesses')
@ApiBearerAuth()
@Controller('admin/businesses/:id/members')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminBusinessMembersController {
  constructor(private readonly service: AdminBusinessMembersService) {}

  @Get()
  @ApiOperation({ summary: 'Members (owner + managers) of the business.' })
  list(@Param('id') id: string) {
    return this.service.list(id);
  }
}
