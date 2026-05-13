import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { createId } from '../../../common/utils/id';

const PICK_PRICE_CENTS = 500;
const DEDUPE_WINDOW_DAYS = 30;

interface ChargeArgs {
  userId: string;
  venueId: string;
  activityId: string;
}

@Injectable()
export class VenueBillingService {
  private readonly logger = new Logger(VenueBillingService.name);

  async chargeForActivityPick(
    tx: Prisma.TransactionClient,
    { userId, venueId, activityId }: ChargeArgs,
  ): Promise<void> {
    const venue = await tx.businessVenue.findUnique({
      where: { id: venueId },
      select: {
        id: true,
        isPaused: true,
        business: { select: { verifiedAt: true, suspendedAt: true } },
      },
    });
    if (!venue) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Suggested venue not found.',
      });
    }

    const isBusinessActive =
      !venue.isPaused &&
      venue.business.verifiedAt !== null &&
      venue.business.suspendedAt === null;

    let chargedCents = 0;
    if (isBusinessActive) {
      const cutoff = new Date(Date.now() - DEDUPE_WINDOW_DAYS * 86_400_000);
      const deduped = await tx.venueSuggestionEvent.findFirst({
        where: {
          venueId,
          userId,
          kind: 'CONFIRMED',
          chargedCents: { gt: 0 },
          createdAt: { gte: cutoff },
        },
        select: { id: true },
      });

      if (!deduped) {
        const decremented = await tx.businessVenue.updateMany({
          where: {
            id: venueId,
            dailyBudgetRemaining: { gte: PICK_PRICE_CENTS },
          },
          data: { dailyBudgetRemaining: { decrement: PICK_PRICE_CENTS } },
        });
        if (decremented.count === 1) chargedCents = PICK_PRICE_CENTS;
      }
    }

    await tx.venueSuggestionEvent.create({
      data: {
        id: createId('vse'),
        venueId,
        userId,
        kind: 'CONFIRMED',
        activityId,
        chargedCents,
      },
    });

    if (chargedCents === 0) {
      this.logger.debug(
        { venueId, userId, activityId, reason: isBusinessActive ? 'deduped_or_budget' : 'inactive' },
        'Venue pick recorded without charge',
      );
    }
  }
}
