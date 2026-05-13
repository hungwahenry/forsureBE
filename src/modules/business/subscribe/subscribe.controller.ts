import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';
import { SkipOnboarding } from '../../../common/decorators/skip-onboarding.decorator';
import { SubscribeService } from './subscribe.service';

@ApiTags('Business / Subscribe')
@ApiBearerAuth()
@Controller('business/subscribe')
@SkipOnboarding()
export class SubscribeController {
  constructor(private readonly service: SubscribeService) {}

  @Post('checkout-session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Start a Stripe Checkout subscription session for the caller's owned business.",
  })
  startCheckout(@CurrentUser() user: AuthenticatedUser) {
    return this.service.startCheckout(user.id);
  }
}
