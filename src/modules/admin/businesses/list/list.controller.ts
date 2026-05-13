import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { ListBusinessesDto } from './dto/list-businesses.dto';
import { AdminBusinessesListService } from './list.service';

@ApiTags('Admin / Businesses')
@ApiBearerAuth()
@Controller('admin/businesses')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminBusinessesListController {
  constructor(private readonly service: AdminBusinessesListService) {}

  @Get()
  @ApiOperation({
    summary: 'List businesses with state filter, search, and cursor pagination.',
  })
  list(@Query() query: ListBusinessesDto) {
    return this.service.list(query);
  }
}
