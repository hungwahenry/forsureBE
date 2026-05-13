import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { StripeService } from '../stripe.service';
import type { StartCheckoutDto } from './dto/start-checkout.dto';

export interface StartCheckoutResult {
  checkoutUrl: string;
}

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  async startCheckout(
    userId: string,
    dto: StartCheckoutDto,
  ): Promise<StartCheckoutResult> {
    const { client, verifiedBusinessPriceId, returnUrlBase } =
      this.stripe.requireConfigured();

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true },
    });

    const session = await client.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: verifiedBusinessPriceId, quantity: 1 }],
      customer_email: user.email,
      success_url: `${returnUrlBase}/business/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrlBase}/business/onboarding`,
      subscription_data: {
        metadata: { userId, businessName: dto.name },
      },
      metadata: { userId, businessName: dto.name },
    });

    if (!session.url) {
      throw new Error('Stripe did not return a Checkout URL.');
    }

    return { checkoutUrl: session.url };
  }
}
