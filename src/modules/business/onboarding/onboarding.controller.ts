import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';
import { SkipOnboarding } from '../../../common/decorators/skip-onboarding.decorator';
import { CreateBusinessDto } from './dto/create-business.dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('Business / Onboarding')
@ApiBearerAuth()
@Controller('business/onboarding')
@SkipOnboarding()
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create the business profile + OWNER membership for the authenticated user.',
  })
  createBusiness(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBusinessDto,
  ) {
    return this.service.createBusiness(user.id, dto);
  }
}
