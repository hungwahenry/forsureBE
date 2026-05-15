import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { ListContactLeadsDto } from './dto/list-contact-leads.dto';
import { AdminContactLeadsListService } from './list.service';

@ApiTags('Admin / Contact leads')
@ApiBearerAuth()
@Controller('admin/contact-leads')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminContactLeadsListController {
  constructor(private readonly service: AdminContactLeadsListService) {}

  @Get()
  @ApiOperation({
    summary: 'List marketing-site contact leads, newest first.',
  })
  list(@Query() query: ListContactLeadsDto) {
    return this.service.list(query);
  }
}
