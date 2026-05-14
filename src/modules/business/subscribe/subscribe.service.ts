import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../common/constants/error-codes';
import { FeatureFlagService } from '../../../common/feature-flags/feature-flag.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { PrismaService } from '../../../prisma/prisma.service';
import { StripeService } from '../stripe.service';

export interface StartSubscribeResult {
  checkoutUrl: string;
}

@Injectable()
export class SubscribeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly featureFlags: FeatureFlagService,
  ) {}

  async startCheckout(userId: string): Promise<StartSubscribeResult> {
    const subscriptionsEnabled = await this.featureFlags.isEnabled(
      'business_subscriptions_enabled',
      true,
    );
    if (!subscriptionsEnabled) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'New subscriptions are temporarily disabled.',
      });
    }

    const { client, verifiedBusinessPriceId, returnUrlBase } =
      this.stripe.requireConfigured();

    const membership = await this.prisma.businessMember.findFirst({
      where: { userId, role: 'OWNER' },
      include: { business: true },
    });
    if (!membership) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'No business to subscribe.',
      });
    }
    if (membership.business.verifiedAt) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'Subscription already active.',
      });
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true },
    });

    const session = await client.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: verifiedBusinessPriceId, quantity: 1 }],
      customer_email: user.email,
      success_url: `${returnUrlBase}/business/subscribe/success`,
      cancel_url: `${returnUrlBase}/business`,
      subscription_data: {
        metadata: { businessId: membership.businessId },
      },
      metadata: { businessId: membership.businessId },
    });

    if (!session.url) {
      throw new Error('Stripe did not return a Checkout URL.');
    }
    return { checkoutUrl: session.url };
  }
}
