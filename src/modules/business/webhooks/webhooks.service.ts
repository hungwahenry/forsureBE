import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createId } from '../../../common/utils/id';
import { PrismaService } from '../../../prisma/prisma.service';
import { StripeService, type StripeEvent } from '../stripe.service';

interface CheckoutSessionData {
  customer?: string | null;
  subscription?: string | null;
  metadata?: { userId?: string; businessName?: string } | null;
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
    const userId = session.metadata?.userId;
    const businessName = session.metadata?.businessName;
    const customerId =
      typeof session.customer === 'string' ? session.customer : null;
    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : null;

    if (!userId || !businessName || !customerId || !subscriptionId) {
      this.logger.warn(
        { userId, businessName, customerId, subscriptionId },
        'checkout.session.completed missing required fields — skipping',
      );
      return;
    }

    // Idempotency: a Stripe subscription only ever maps to one Business row.
    const existing = await this.prisma.business.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      select: { id: true },
    });
    if (existing) return;

    const slug = await this.uniqueSlugFor(businessName);

    await this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          id: createId('bus'),
          slug,
          name: businessName,
          verifiedAt: new Date(),
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
        },
        select: { id: true },
      });
      await tx.businessMember.create({
        data: {
          id: createId('bmm'),
          businessId: business.id,
          userId,
          role: 'OWNER',
        },
      });
    });
  }

  private async uniqueSlugFor(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'business';
    let candidate = base;
    let attempt = 0;
    while (true) {
      try {
        const taken = await this.prisma.business.findUnique({
          where: { slug: candidate },
          select: { id: true },
        });
        if (!taken) return candidate;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          // Race — fall through to a new candidate
        } else {
          throw err;
        }
      }
      attempt += 1;
      candidate = `${base}-${attempt}`;
      if (attempt > 50) {
        candidate = `${base}-${createId('').slice(0, 6)}`;
        return candidate;
      }
    }
  }
}
