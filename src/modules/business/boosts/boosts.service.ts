import { Injectable, Logger } from '@nestjs/common';
import { ActivityRole, ActivityStatus } from '@prisma/client';
import { ErrorCode } from '../../../common/constants/error-codes';
import { FeatureFlagService } from '../../../common/feature-flags/feature-flag.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { createId } from '../../../common/utils/id';
import { PrismaService } from '../../../prisma/prisma.service';
import { StripeService } from '../stripe.service';
import { BoostsPricingService } from './boosts-pricing.service';
import {
  serializeActivityBoost,
  type ActivityBoostDto,
} from './boosts.serializer';
import type { PreviewBoostDto } from './dto/preview-boost.dto';
import type { StartBoostDto } from './dto/start-boost.dto';

@Injectable()
export class BoostsService {
  private readonly logger = new Logger(BoostsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly pricing: BoostsPricingService,
    private readonly featureFlags: FeatureFlagService,
  ) {}

  async preview(businessId: string, userId: string, dto: PreviewBoostDto) {
    await this.requireBoostableActivity(userId, dto.activityId);
    return this.pricing.preview(businessId);
  }

  async start(
    businessId: string,
    userId: string,
    dto: StartBoostDto,
  ): Promise<ActivityBoostDto> {
    const boostsEnabled = await this.featureFlags.isEnabled(
      'business_boosts_enabled',
      true,
    );
    if (!boostsEnabled) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'Boosts are temporarily disabled.',
      });
    }
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { autoPausedAt: true },
    });
    if (business.autoPausedAt) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message:
          'Your business is paused pending review. New boosts cannot start until support clears the pause.',
      });
    }
    const activity = await this.requireBoostableActivity(userId, dto.activityId);

    const now = new Date();
    const naturalEnd = new Date(
      now.getTime() + this.pricing.durationHours * 3_600_000,
    );
    const endsAt =
      activity.startsAt.getTime() < naturalEnd.getTime()
        ? activity.startsAt
        : naturalEnd;

    const used = await this.pricing.countCycleBoosts(businessId);
    const isOverage = used >= this.pricing.freePerCycle;

    let stripeInvoiceItemId: string | null = null;
    if (isOverage) {
      stripeInvoiceItemId = await this.attachOverageInvoiceItem(
        businessId,
        activity.title,
      );
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
          chargedCents: isOverage ? this.pricing.overageCents : 0,
          isOverage,
          stripeInvoiceItemId,
        },
      });
      return serializeActivityBoost(row);
    } catch (err) {
      if (stripeInvoiceItemId) {
        await this.stripe
          .deleteInvoiceItem(stripeInvoiceItemId)
          .catch((cleanupErr) => {
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

  cycleSummary(businessId: string) {
    return this.pricing.summarizeCycle(businessId);
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

  private async attachOverageInvoiceItem(
    businessId: string,
    activityTitle: string,
  ): Promise<string> {
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
    return this.stripe.createSubscriptionInvoiceItem({
      customerId: business.stripeCustomerId,
      subscriptionId: business.stripeSubscriptionId,
      amountCents: this.pricing.overageCents,
      description: `Activity boost: ${activityTitle}`,
      metadata: { businessId, kind: 'boost_overage' },
    });
  }

  private async requireBoostableActivity(userId: string, activityId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        participants: {
          where: { role: ActivityRole.HOST },
          select: { userId: true },
        },
      },
    });
    if (!activity || activity.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Activity not found.',
      });
    }
    if (activity.participants[0]?.userId !== userId) {
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
}
