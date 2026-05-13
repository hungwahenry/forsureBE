import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { StripeService, type StripeEvent } from '../stripe.service';

interface CheckoutSessionData {
  customer?: string | null;
  subscription?: string | null;
  metadata?: { businessId?: string } | null;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  handle(payload: Buffer, signature: string): Promise<void> {
    const event = this.stripe.constructWebhookEvent(payload, signature);
    return this.dispatch(event);
  }

  private async dispatch(event: StripeEvent): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        return this.onCheckoutCompleted(
          event.data.object as CheckoutSessionData,
        );
      default:
        this.logger.debug(`Ignoring Stripe event ${event.type}`);
        return;
    }
  }

  private async onCheckoutCompleted(
    session: CheckoutSessionData,
  ): Promise<void> {
    const businessId = session.metadata?.businessId;
    const customerId =
      typeof session.customer === 'string' ? session.customer : null;
    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : null;

    if (!businessId || !customerId || !subscriptionId) {
      this.logger.warn(
        { businessId, customerId, subscriptionId },
        'checkout.session.completed missing required fields — skipping',
      );
      return;
    }

    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        verifiedAt: { set: new Date() },
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
      },
    });
  }
}
