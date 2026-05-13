import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActivityStatus } from '@prisma/client';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { createId } from '../../../common/utils/id';
import type { Env } from '../../../config/env.schema';
import { PrismaService } from '../../../prisma/prisma.service';
import { StripeService } from '../stripe.service';
import type { PreviewBoostDto } from './dto/preview-boost.dto';
import type { StartBoostDto } from './dto/start-boost.dto';
import {
  serializeActivityBoost,
  type ActivityBoostDto,
} from './boosts.serializer';

export interface BoostPreviewDto {
  willCharge: boolean;
  chargeCents: number;
  freeBoostsUsed: number;
  freeBoostsCap: number;
  durationHours: number;
}

const CYCLE_WINDOW_MS = 30 * 86_400_000;

@Injectable()
export class BoostsService {
  private readonly logger = new Logger(BoostsService.name);
  private readonly freePerCycle: number;
  private readonly overageCents: number;
  private readonly durationHours: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    config: ConfigService<Env, true>,
  ) {
    this.freePerCycle = config.get('BOOST_FREE_PER_CYCLE', { infer: true });
    this.overageCents = config.get('BOOST_OVERAGE_CENTS', { infer: true });
    this.durationHours = config.get('BOOST_DURATION_HOURS', { infer: true });
  }

  async preview(
    businessId: string,
    userId: string,
    dto: PreviewBoostDto,
  ): Promise<BoostPreviewDto> {
    await this.requireBoostableActivity(userId, dto.activityId);
    const used = await this.countCycleBoosts(businessId);
    const willCharge = used >= this.freePerCycle;
    return {
      willCharge,
      chargeCents: willCharge ? this.overageCents : 0,
      freeBoostsUsed: used,
      freeBoostsCap: this.freePerCycle,
      durationHours: this.durationHours,
    };
  }

  async start(
    businessId: string,
    userId: string,
    dto: StartBoostDto,
  ): Promise<ActivityBoostDto> {
    const activity = await this.requireBoostableActivity(
      userId,
      dto.activityId,
    );

    const now = new Date();
    const naturalEnd = new Date(now.getTime() + this.durationHours * 3_600_000);
    const endsAt =
      activity.startsAt.getTime() < naturalEnd.getTime()
        ? activity.startsAt
        : naturalEnd;

    const used = await this.countCycleBoosts(businessId);
    const isOverage = used >= this.freePerCycle;

    let stripeInvoiceItemId: string | null = null;
    if (isOverage) {
      stripeInvoiceItemId = await this.createInvoiceItem({
        businessId,
        activityTitle: activity.title,
      });
    }

    try {
      const row = await this.prisma.activityBoost.create({
        data: {
          id: createId('abt'),
          activityId: dto.activityId,
          businessId,
          radiusM: dto.radiusM,
          startsAt: now,
          endsAt,
          chargedCents: isOverage ? this.overageCents : 0,
          isOverage,
          stripeInvoiceItemId,
        },
      });
      return serializeActivityBoost(row);
    } catch (err) {
      // DB write failed after we created the Stripe invoice item — best-effort
      // delete the item so the business isn't billed for a phantom boost.
      if (stripeInvoiceItemId) {
        await this.cancelInvoiceItem(stripeInvoiceItemId).catch((cleanupErr) => {
          this.logger.error(
            { stripeInvoiceItemId, err: cleanupErr },
            'Failed to clean up Stripe invoice item after DB write failure',
          );
        });
      }
      throw err;
    }
  }

  async list(businessId: string): Promise<ActivityBoostDto[]> {
    const rows = await this.prisma.activityBoost.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map(serializeActivityBoost);
  }

  async cancel(
    businessId: string,
    boostId: string,
  ): Promise<ActivityBoostDto> {
    const boost = await this.prisma.activityBoost.findUnique({
      where: { id: boostId },
    });
    if (!boost || boost.businessId !== businessId) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Boost not found.',
      });
    }
    if (boost.cancelledAt || boost.endsAt.getTime() <= Date.now()) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'Boost is already finalised.',
      });
    }
    const updated = await this.prisma.activityBoost.update({
      where: { id: boostId },
      data: { cancelledAt: new Date() },
    });
    return serializeActivityBoost(updated);
  }

  private async requireBoostableActivity(userId: string, activityId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        participants: {
          where: { role: 'HOST' },
          select: { userId: true },
        },
      },
    });
    if (!activity || activity.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Activity not found.',
      });
    }
    const hostId = activity.participants[0]?.userId;
    if (hostId !== userId) {
      throw new AppException(ErrorCode.AUTH_FORBIDDEN, {
        message: 'Only the host can boost this activity.',
      });
    }
    if (activity.status !== ActivityStatus.OPEN) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'Only OPEN activities can be boosted.',
      });
    }
    if (activity.startsAt.getTime() <= Date.now()) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'Activity has already started.',
      });
    }
    const existingActive = await this.prisma.activityBoost.findFirst({
      where: {
        activityId,
        cancelledAt: null,
        endsAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (existingActive) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'This activity is already boosted.',
      });
    }
    return activity;
  }

  private async countCycleBoosts(businessId: string): Promise<number> {
    const cutoff = new Date(Date.now() - CYCLE_WINDOW_MS);
    return this.prisma.activityBoost.count({
      where: { businessId, createdAt: { gte: cutoff } },
    });
  }

  private async createInvoiceItem({
    businessId,
    activityTitle,
  }: {
    businessId: string;
    activityTitle: string;
  }): Promise<string> {
    const { client } = this.stripe.requireConfigured();
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { stripeCustomerId: true, stripeSubscriptionId: true },
    });
    if (!business.stripeCustomerId || !business.stripeSubscriptionId) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message:
          'Your subscription is not active yet — finish billing setup before boosting beyond your included boosts.',
      });
    }
    const item = await client.invoiceItems.create({
      customer: business.stripeCustomerId,
      amount: this.overageCents,
      currency: 'usd',
      description: `Activity boost: ${activityTitle}`,
      subscription: business.stripeSubscriptionId,
      metadata: { businessId, kind: 'boost_overage' },
    });
    return item.id;
  }

  private async cancelInvoiceItem(invoiceItemId: string): Promise<void> {
    const { client } = this.stripe.requireConfigured();
    await client.invoiceItems.del(invoiceItemId);
  }
}
