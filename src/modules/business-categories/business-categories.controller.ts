import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../common/decorators/skip-onboarding.decorator';
import { PublicBusinessCategoriesService } from './business-categories.service';

@ApiTags('Business categories')
@ApiBearerAuth()
@Controller('business-categories')
@SkipOnboarding()
export class PublicBusinessCategoriesController {
  constructor(private readonly service: PublicBusinessCategoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'Active business categories for the owner-facing category picker.',
  })
  list() {
    return this.service.listActive();
  }
}
