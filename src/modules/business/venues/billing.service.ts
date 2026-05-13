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
  activityLat: number;
  activityLng: number;
}

@Injectable()
export class VenueBillingService {
  private readonly logger = new Logger(VenueBillingService.name);

  async chargeForActivityPick(
    tx: Prisma.TransactionClient,
    { userId, venueId, activityId, activityLat, activityLng }: ChargeArgs,
  ): Promise<void> {
    const locked = await tx.$queryRaw<
      Array<{
        isPaused: boolean;
        verifiedAt: Date | null;
        suspendedAt: Date | null;
        inRange: boolean;
      }>
    >`
      SELECT
        v."isPaused",
        b."verifiedAt",
        b."suspendedAt",
        ST_DWithin(
          v."placePoint",
          ST_SetSRID(ST_MakePoint(${activityLng}, ${activityLat}), 4326)::geography,
          v."maxRadiusM"
        ) AS "inRange"
      FROM "BusinessVenue" v
      JOIN "Business" b ON b.id = v."businessId"
      WHERE v.id = ${venueId}
      FOR UPDATE OF v
    `;
    if (locked.length === 0) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Suggested venue not found.',
      });
    }
    const venue = locked[0];

    const isBusinessActive =
      !venue.isPaused &&
      venue.verifiedAt !== null &&
      venue.suspendedAt === null &&
      venue.inRange;

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
      const reason = !venue.inRange
        ? 'out_of_range'
        : isBusinessActive
          ? 'deduped_or_budget'
          : 'inactive';
      this.logger.debug(
        { venueId, userId, activityId, reason },
        'Venue pick recorded without charge',
      );
    }
  }
}
