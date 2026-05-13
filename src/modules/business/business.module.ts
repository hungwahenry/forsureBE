import { Module } from '@nestjs/common';
import { BusinessService } from './business.service';
import { OnboardingController } from './onboarding/onboarding.controller';
import { OnboardingService } from './onboarding/onboarding.service';
import { StripeService } from './stripe.service';
import { SubscribeController } from './subscribe/subscribe.controller';
import { SubscribeService } from './subscribe/subscribe.service';
import { WebhooksController } from './webhooks/webhooks.controller';
import { WebhooksService } from './webhooks/webhooks.service';

@Module({
  controllers: [
    OnboardingController,
    SubscribeController,
    WebhooksController,
  ],
  providers: [
    BusinessService,
    StripeService,
    OnboardingService,
    SubscribeService,
    WebhooksService,
  ],
  exports: [BusinessService],
})
export class BusinessModule {}
