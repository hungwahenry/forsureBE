import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';
import { SkipOnboarding } from '../../../common/decorators/skip-onboarding.decorator';
import { StartCheckoutDto } from './dto/start-checkout.dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('Business / Onboarding')
@ApiBearerAuth()
@Controller('business/onboarding')
@SkipOnboarding()
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Post('checkout-session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Start a Stripe Checkout subscription session for the verified-business tier.',
  })
  startCheckout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartCheckoutDto,
  ) {
    return this.service.startCheckout(user.id, dto);
  }
}
