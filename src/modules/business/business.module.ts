import { Module } from '@nestjs/common';
import { BusinessActivitiesController } from './activities/activities.controller';
import { BusinessActivitiesService } from './activities/activities.service';
import { BoostsController } from './boosts/boosts.controller';
import { BoostsPricingService } from './boosts/boosts-pricing.service';
import { BoostsService } from './boosts/boosts.service';
import { BusinessService } from './business.service';
import { OnboardingController } from './onboarding/onboarding.controller';
import { OnboardingService } from './onboarding/onboarding.service';
import { BusinessMemberGuard } from './shared/business-member.guard';
import { StripeService } from './stripe.service';
import { SubscribeController } from './subscribe/subscribe.controller';
import { SubscribeService } from './subscribe/subscribe.service';
import { VenueAnalyticsController } from './venues/analytics/analytics.controller';
import { VenueAnalyticsService } from './venues/analytics/analytics.service';
import { VenueBillingService } from './venues/billing.service';
import { VenueBudgetResetScheduler } from './venues/scheduled/budget-reset.scheduler';
import { VenuesController } from './venues/venues.controller';
import { VenuesService } from './venues/venues.service';
import { WebhooksController } from './webhooks/webhooks.controller';
import { WebhooksService } from './webhooks/webhooks.service';

@Module({
  controllers: [
    OnboardingController,
    SubscribeController,
    VenuesController,
    VenueAnalyticsController,
    BusinessActivitiesController,
    BoostsController,
    WebhooksController,
  ],
  providers: [
    BusinessService,
    BusinessMemberGuard,
    StripeService,
    OnboardingService,
    SubscribeService,
    VenueAnalyticsService,
    VenueBillingService,
    VenueBudgetResetScheduler,
    VenuesService,
    BusinessActivitiesService,
    BoostsService,
    BoostsPricingService,
    WebhooksService,
  ],
  exports: [BusinessService, VenueBillingService],
})
export class BusinessModule {}
