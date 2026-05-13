import { Injectable } from '@nestjs/common';
import { ActivityRole, type Activity } from '@prisma/client';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { createId } from '../../../common/utils/id';
import { PrismaService } from '../../../prisma/prisma.service';
import { VenueBillingService } from '../../business/venues/billing.service';
import { MembershipService } from '../../chats/membership/membership.service';
import { CreateActivityDto } from './dto/create-activity.dto';

const MIN_LEAD_TIME_MS = 30 * 60_000; // 30 minutes

@Injectable()
export class CreateActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly venueBilling: VenueBillingService,
  ) {}

  async create(
    authorUserId: string,
    dto: CreateActivityDto,
  ): Promise<Activity> {
    if (dto.startsAt.getTime() < Date.now() + MIN_LEAD_TIME_MS) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'Activities must start at least 30 minutes from now.',
      });
    }

    const activityId = createId('act');
    const activity = await this.prisma.$transaction(async (tx) => {
      let resolvedVenueId: string | null = null;
      if (dto.businessVenueId) {
        const venue = await tx.businessVenue.findUnique({
          where: { id: dto.businessVenueId },
          select: { id: true },
        });
        resolvedVenueId = venue?.id ?? null;
      }

      const created = await tx.activity.create({
        data: {
          id: activityId,
          emoji: dto.emoji,
          title: dto.title,
          startsAt: dto.startsAt,
          placeName: dto.placeName,
          placeLat: dto.placeLat,
          placeLng: dto.placeLng,
          capacity: dto.capacity,
          genderPreference: dto.genderPreference,
          memoriesShareablePublicly: dto.memoriesShareablePublicly ?? false,
          participantCount: 1,
          businessVenueId: resolvedVenueId,
        },
      });
      await tx.activityParticipant.create({
        data: {
          id: createId('ap'),
          activityId,
          userId: authorUserId,
          role: ActivityRole.HOST,
        },
      });
      await tx.profile.update({
        where: { userId: authorUserId },
        data: {
          activitiesHostedCount: { increment: 1 },
          activitiesJoinedCount: { increment: 1 },
        },
      });
      if (resolvedVenueId) {
        await this.venueBilling.chargeForActivityPick(tx, {
          userId: authorUserId,
          venueId: resolvedVenueId,
          activityId,
          activityLat: dto.placeLat,
          activityLng: dto.placeLng,
        });
      }
      return created;
    });

    // Add the host's currently-connected sockets to the new chat room.
    await this.membership.addToChat(authorUserId, activityId);
    return activity;
  }
}
