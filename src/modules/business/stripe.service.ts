import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import type { Env } from '../../config/env.schema';

type StripeClient = Stripe.Stripe;
export type StripeEvent = ReturnType<
  StripeClient['webhooks']['constructEvent']
>;

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly client: StripeClient | null;
  private readonly webhookSecret: string | null;
  private readonly verifiedBusinessPriceId: string | null;
  private readonly returnUrlBase: string | null;

  constructor(config: ConfigService<Env, true>) {
    const secretKey = config.get('STRIPE_SECRET_KEY', { infer: true });
    this.client = secretKey ? new Stripe(secretKey) : null;
    this.webhookSecret =
      config.get('STRIPE_WEBHOOK_SECRET', { infer: true }) ?? null;
    this.verifiedBusinessPriceId =
      config.get('STRIPE_PRICE_ID_VERIFIED_BUSINESS', { infer: true }) ?? null;
    this.returnUrlBase =
      config.get('STRIPE_RETURN_URL_BASE', { infer: true }) ?? null;
    if (!this.client) {
      this.logger.warn(
        'STRIPE_SECRET_KEY is unset — business onboarding endpoints will return 503.',
      );
    }
  }

  requireConfigured(): {
    client: StripeClient;
    verifiedBusinessPriceId: string;
    returnUrlBase: string;
  } {
    if (!this.client || !this.verifiedBusinessPriceId || !this.returnUrlBase) {
      throw new AppException(ErrorCode.INTERNAL_ERROR, {
        message: 'Billing is not configured.',
      });
    }
    return {
      client: this.client,
      verifiedBusinessPriceId: this.verifiedBusinessPriceId,
      returnUrlBase: this.returnUrlBase,
    };
  }

  constructWebhookEvent(payload: Buffer, signature: string): StripeEvent {
    if (!this.client || !this.webhookSecret) {
      throw new AppException(ErrorCode.INTERNAL_ERROR, {
        message: 'Stripe webhooks not configured.',
      });
    }
    return this.client.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret,
    );
  }

  async createSubscriptionInvoiceItem(opts: {
    customerId: string;
    subscriptionId: string;
    amountCents: number;
    description: string;
    metadata?: Record<string, string>;
    idempotencyKey?: string;
  }): Promise<string> {
    const { client } = this.requireConfigured();
    const item = await client.invoiceItems.create(
      {
        customer: opts.customerId,
        subscription: opts.subscriptionId,
        amount: opts.amountCents,
        currency: 'usd',
        description: opts.description,
        metadata: opts.metadata,
      },
      opts.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : undefined,
    );
    return item.id;
  }

  async deleteInvoiceItem(invoiceItemId: string): Promise<void> {
    const { client } = this.requireConfigured();
    await client.invoiceItems.del(invoiceItemId);
  }
}
