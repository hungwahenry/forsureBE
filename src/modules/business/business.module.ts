import { Module } from '@nestjs/common';
import { BusinessService } from './business.service';
import { OnboardingController } from './onboarding/onboarding.controller';
import { OnboardingService } from './onboarding/onboarding.service';
import { BusinessMemberGuard } from './shared/business-member.guard';
import { StripeService } from './stripe.service';
import { SubscribeController } from './subscribe/subscribe.controller';
import { SubscribeService } from './subscribe/subscribe.service';
import { VenuesController } from './venues/venues.controller';
import { VenuesService } from './venues/venues.service';
import { WebhooksController } from './webhooks/webhooks.controller';
import { WebhooksService } from './webhooks/webhooks.service';

@Module({
  controllers: [
    OnboardingController,
    SubscribeController,
    VenuesController,
    WebhooksController,
  ],
  providers: [
    BusinessService,
    BusinessMemberGuard,
    StripeService,
    OnboardingService,
    SubscribeService,
    VenuesService,
    WebhooksService,
  ],
  exports: [BusinessService],
})
export class BusinessModule {}
