import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { createHash } from 'crypto';
import { CronRunLogger } from '../../../../common/cron/cron-run-logger.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { StripeService } from '../../stripe.service';

const JOB_NAME = 'VenuePicksRolloverScheduler.rollover';

interface UnsettledRow {
  eventId: string;
  businessId: string;
  chargedCents: number;
}

interface RolloverSummary {
  businessesProcessed: number;
  businessesSkipped: number;
  totalSettledCents: number;
  totalEvents: number;
  errors: number;
}

@Injectable()
export class VenuePicksRolloverScheduler {
  private readonly logger = new Logger(VenuePicksRolloverScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly runLogger: CronRunLogger,
  ) {}

  @Cron('0 3 * * *', { timeZone: 'UTC' })
  async rollover(): Promise<void> {
    await this.runLogger.wrap(JOB_NAME, async () => this.runOnce());
  }

  private async runOnce(): Promise<RolloverSummary> {
    const summary: RolloverSummary = {
      businessesProcessed: 0,
      businessesSkipped: 0,
      totalSettledCents: 0,
      totalEvents: 0,
      errors: 0,
    };

    const unsettled = await this.prisma.$queryRaw<UnsettledRow[]>`
      SELECT
        vse.id          AS "eventId",
        v."businessId"  AS "businessId",
        vse."chargedCents" AS "chargedCents"
      FROM "VenueSuggestionEvent" vse
      JOIN "BusinessVenue" v ON v.id = vse."venueId"
      WHERE vse.kind = 'CONFIRMED'
        AND vse."chargedCents" > 0
        AND vse."settledAt" IS NULL
      ORDER BY v."businessId", vse.id
    `;

    if (unsettled.length === 0) {
      this.logger.log('No unsettled venue picks to roll over.');
      return summary;
    }

    const byBusiness = new Map<string, UnsettledRow[]>();
    for (const row of unsettled) {
      const list = byBusiness.get(row.businessId) ?? [];
      list.push(row);
      byBusiness.set(row.businessId, list);
    }

    for (const [businessId, events] of byBusiness) {
      try {
        const settled = await this.rolloverBusiness(businessId, events);
        if (settled === null) {
          summary.businessesSkipped += 1;
        } else {
          summary.businessesProcessed += 1;
          summary.totalSettledCents += settled;
          summary.totalEvents += events.length;
        }
      } catch (err: unknown) {
        summary.errors += 1;
        this.logger.error(
          { err, businessId, eventCount: events.length },
          'Failed to roll over venue picks for business',
        );
      }
    }

    this.logger.log(
      `Rolled up ${summary.totalEvents} events across ${summary.businessesProcessed} businesses (skipped ${summary.businessesSkipped}, errors ${summary.errors})`,
    );
    return summary;
  }

  /** Returns the cents settled, or null if the business was skipped. */
  private async rolloverBusiness(
    businessId: string,
    events: UnsettledRow[],
  ): Promise<number | null> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        suspendedAt: true,
      },
    });
    if (
      !business ||
      !business.stripeCustomerId ||
      !business.stripeSubscriptionId ||
      business.suspendedAt
    ) {
      this.logger.warn(
        { businessId, eventCount: events.length },
        'Skipping rollover — business has no active subscription or is suspended',
      );
      return null;
    }

    const totalCents = events.reduce((sum, e) => sum + e.chargedCents, 0);
    const eventIds = events.map((e) => e.eventId);
    const idempotencyKey = `venue_rollup:${createHash('sha256')
      .update(`${businessId}:${eventIds.join(',')}`)
      .digest('hex')
      .slice(0, 32)}`;

    const description = `Venue suggestion picks · ${events.length} × $5.00`;
    const invoiceItemId = await this.stripe.createSubscriptionInvoiceItem({
      customerId: business.stripeCustomerId,
      subscriptionId: business.stripeSubscriptionId,
      amountCents: totalCents,
      description,
      metadata: { businessId, kind: 'venue_pick_rollover' },
      idempotencyKey,
    });

    await this.prisma.venueSuggestionEvent.updateMany({
      where: { id: { in: eventIds } },
      data: { stripeInvoiceItemId: invoiceItemId, settledAt: new Date() },
    });

    return totalCents;
  }
}
