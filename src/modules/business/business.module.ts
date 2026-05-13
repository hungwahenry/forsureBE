import { Module } from '@nestjs/common';
import { BusinessService } from './business.service';
import { OnboardingController } from './onboarding/onboarding.controller';
import { OnboardingService } from './onboarding/onboarding.service';
import { StripeService } from './stripe.service';
import { WebhooksController } from './webhooks/webhooks.controller';
import { WebhooksService } from './webhooks/webhooks.service';

@Module({
  controllers: [OnboardingController, WebhooksController],
  providers: [
    BusinessService,
    StripeService,
    OnboardingService,
    WebhooksService,
  ],
  exports: [BusinessService],
})
export class BusinessModule {}
