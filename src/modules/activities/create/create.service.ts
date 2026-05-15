import { Injectable } from '@nestjs/common';
import { ActivityRole } from '@prisma/client';
import { AppConfigService } from '../../../common/app-config/app-config.service';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { createId } from '../../../common/utils/id';
import { PrismaService } from '../../../prisma/prisma.service';
import { VenueBillingService } from '../../business/venues/billing.service';
import { MembershipService } from '../../chats/membership/membership.service';
import {
  serializeActivitySummary,
  type ActivitySummaryDto,
} from '../activity.serializer';
import { CreateActivityDto } from './dto/create-activity.dto';

@Injectable()
export class CreateActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly venueBilling: VenueBillingService,
    private readonly appConfig: AppConfigService,
  ) {}

  async create(
    authorUserId: string,
    dto: CreateActivityDto,
  ): Promise<ActivitySummaryDto> {
    const minLeadMinutes = await this.appConfig.getInt(
      'activity.min_lead_time_minutes',
    );
    if (dto.startsAt.getTime() < Date.now() + minLeadMinutes * 60_000) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: `Activities must start at least ${minLeadMinutes} minutes from now.`,
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
    return serializeActivitySummary(activity);
  }
}
