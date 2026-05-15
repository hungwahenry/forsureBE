import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StripeService, type StripeEvent } from '../stripe.service';

interface CheckoutSessionData {
  customer?: string | null;
  subscription?: string | null;
  metadata?: { businessId?: string } | null;
}

interface SubscriptionData {
  id: string;
  status: string;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  async handle(payload: Buffer, signature: string): Promise<void> {
    const event = this.stripe.constructWebhookEvent(payload, signature);

    try {
      await this.prisma.stripeWebhookEvent.create({
        data: { id: event.id, type: event.type },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        this.logger.debug(
          { eventId: event.id, type: event.type },
          'Stripe event already processed — skipping',
        );
        return;
      }
      throw err;
    }

    await this.dispatch(event);
  }

  private async dispatch(event: StripeEvent): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        return this.onCheckoutCompleted(
          event.data.object as CheckoutSessionData,
        );
      case 'customer.subscription.updated':
        return this.onSubscriptionUpdated(
          event.data.object as SubscriptionData,
        );
      case 'customer.subscription.deleted':
        return this.onSubscriptionDeleted(
          event.data.object as SubscriptionData,
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

    const now = new Date();
    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        verifiedAt: { set: now },
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripeSubscriptionStatus: 'active',
        stripeSubscriptionStatusAt: now,
      },
    });
  }

  private async onSubscriptionUpdated(
    subscription: SubscriptionData,
  ): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      select: { id: true, stripeSubscriptionStatus: true },
    });
    if (!business) {
      this.logger.warn(
        { subscriptionId: subscription.id },
        'customer.subscription.updated matched no business — unknown subscription',
      );
      return;
    }
    if (business.stripeSubscriptionStatus === subscription.status) {
      return;
    }
    await this.prisma.business.update({
      where: { id: business.id },
      data: {
        stripeSubscriptionStatus: subscription.status,
        stripeSubscriptionStatusAt: new Date(),
      },
    });
  }

  private async onSubscriptionDeleted(
    subscription: SubscriptionData,
  ): Promise<void> {
    const updated = await this.prisma.business.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        verifiedAt: null,
        stripeSubscriptionId: null,
        stripeSubscriptionStatus: 'canceled',
        stripeSubscriptionStatusAt: new Date(),
      },
    });
    if (updated.count === 0) {
      this.logger.warn(
        { subscriptionId: subscription.id },
        'customer.subscription.deleted matched no business — already cleared or unknown',
      );
    }
  }
}
