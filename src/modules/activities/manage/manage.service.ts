import { Injectable } from '@nestjs/common';
import {
  ActivityRole,
  ActivityStatus,
  PostVisibility,
  type Activity,
  type Prisma,
} from '@prisma/client';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { PrismaService } from '../../../prisma/prisma.service';
import { VenueBillingService } from '../../business/venues/billing.service';
import { ChatEvents, chatRoom } from '../../chats/chats.events';
import { MembershipService } from '../../chats/membership/membership.service';
import { MessagesService } from '../../chats/messages/messages.service';
import { ActivityLifecycleNotifications } from '../../notifications/producers/activity-lifecycle.producer';
import { RealtimeService } from '../../../realtime/realtime.service';
import {
  serializeActivitySummary,
  type ActivitySummaryDto,
} from '../activity.serializer';
import { EditActivityDto } from './dto/edit-activity.dto';

const MIN_LEAD_TIME_MS = 30 * 60_000;

@Injectable()
export class ManageActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly membership: MembershipService,
    private readonly messages: MessagesService,
    private readonly notifications: ActivityLifecycleNotifications,
    private readonly venueBilling: VenueBillingService,
  ) {}

  private async requireHost(
    userId: string,
    activityId: string,
  ): Promise<Activity> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity || activity.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
    }
    const membership = await this.membership.requireChatMembership(
      userId,
      activityId,
    );
    if (membership.role !== ActivityRole.HOST) {
      throw new AppException(ErrorCode.AUTH_FORBIDDEN, {
        message: 'Only the host can do that.',
      });
    }
    return activity;
  }

  async edit(
    userId: string,
    activityId: string,
    dto: EditActivityDto,
  ): Promise<ActivitySummaryDto> {
    const activity = await this.requireHost(userId, activityId);

    const planningFieldsChanged =
      dto.emoji !== undefined ||
      dto.title !== undefined ||
      dto.startsAt !== undefined ||
      dto.placeName !== undefined ||
      dto.placeLat !== undefined ||
      dto.placeLng !== undefined ||
      dto.capacity !== undefined ||
      dto.genderPreference !== undefined ||
      dto.businessVenueId !== undefined;

    if (planningFieldsChanged && activity.status !== ActivityStatus.OPEN) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'Only OPEN activities can be edited.',
      });
    }

    const data: Prisma.ActivityUpdateInput = {};
    const hasMembers = activity.participantCount > 1;

    if (dto.emoji !== undefined) data.emoji = dto.emoji;
    if (dto.title !== undefined) data.title = dto.title;

    if (dto.startsAt !== undefined) {
      if (dto.startsAt.getTime() < Date.now() + MIN_LEAD_TIME_MS) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, {
          message: 'New start time must be at least 30 minutes from now.',
        });
      }
      data.startsAt = dto.startsAt;
    }

    if (
      dto.placeName !== undefined ||
      dto.placeLat !== undefined ||
      dto.placeLng !== undefined
    ) {
      const allOrNone =
        dto.placeName !== undefined &&
        dto.placeLat !== undefined &&
        dto.placeLng !== undefined;
      if (!allOrNone) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, {
          message: 'Place edit requires placeName, placeLat, and placeLng.',
        });
      }
      data.placeName = dto.placeName;
      data.placeLat = dto.placeLat;
      data.placeLng = dto.placeLng;
    }

    if (dto.capacity !== undefined) {
      if (dto.capacity < activity.participantCount) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, {
          message: `Capacity can't be lower than the current participant count (${activity.participantCount}).`,
        });
      }
      data.capacity = dto.capacity;
    }

    if (dto.genderPreference !== undefined) {
      if (hasMembers) {
        throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
          message: 'Gender preference can only change before any member joins.',
        });
      }
      data.genderPreference = dto.genderPreference;
    }

    if (dto.memoriesShareablePublicly !== undefined) {
      data.memoriesShareablePublicly = dto.memoriesShareablePublicly;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.businessVenueId !== undefined) {
        let resolvedVenueId: string | null = null;
        if (dto.businessVenueId !== null) {
          const venue = await tx.businessVenue.findUnique({
            where: { id: dto.businessVenueId },
            select: { id: true },
          });
          resolvedVenueId = venue?.id ?? null;
        }
        data.businessVenue = resolvedVenueId
          ? { connect: { id: resolvedVenueId } }
          : { disconnect: true };
      }

      const venueLinkChangedTo =
        dto.businessVenueId !== undefined &&
        dto.businessVenueId !== null &&
        dto.businessVenueId !== activity.businessVenueId &&
        data.businessVenue !== undefined &&
        'connect' in (data.businessVenue as object)
          ? dto.businessVenueId
          : null;

      const next = await tx.activity.update({
        where: { id: activityId },
        data,
      });
      if (dto.memoriesShareablePublicly === false) {
        await tx.activityPost.updateMany({
          where: { activityId, visibility: PostVisibility.PUBLIC },
          data: { visibility: PostVisibility.PARTICIPANTS },
        });
      }
      if (venueLinkChangedTo) {
        await this.venueBilling.chargeForActivityPick(tx, {
          userId,
          venueId: venueLinkChangedTo,
          activityId,
          activityLat: next.placeLat,
          activityLng: next.placeLng,
        });
      }
      return next;
    });

    this.realtime.toRoom(chatRoom(activityId), ChatEvents.ActivityUpdated, {
      activityId,
    });
    return serializeActivitySummary(updated);
  }

  async cancel(
    userId: string,
    activityId: string,
  ): Promise<ActivitySummaryDto> {
    const activity = await this.requireHost(userId, activityId);
    if (
      activity.status === ActivityStatus.CANCELLED ||
      activity.status === ActivityStatus.DONE
    ) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'Activity is already finalised.',
      });
    }

    const updated = await this.prisma.activity.update({
      where: { id: activityId },
      data: { status: ActivityStatus.CANCELLED },
    });

    await this.messages.postSystemMessage(
      activityId,
      userId,
      'host cancelled this activity',
    );
    this.realtime.toRoom(chatRoom(activityId), ChatEvents.ActivityUpdated, {
      activityId,
    });
    void this.notifications.cancellation(activityId);
    return serializeActivitySummary(updated);
  }

  async kick(
    hostUserId: string,
    activityId: string,
    targetUserId: string,
  ): Promise<void> {
    if (hostUserId === targetUserId) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: "You can't remove yourself.",
      });
    }
    await this.requireHost(hostUserId, activityId);

    const target = await this.prisma.activityParticipant.findUnique({
      where: { activityId_userId: { activityId, userId: targetUserId } },
      include: { user: { include: { profile: true } } },
    });
    if (!target || target.role !== ActivityRole.MEMBER) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'That user is not a member of this activity.',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.activityParticipant.delete({
        where: { activityId_userId: { activityId, userId: targetUserId } },
      });
      await tx.activity.update({
        where: { id: activityId },
        data: { participantCount: { decrement: 1 } },
      });
      await tx.profile.update({
        where: { userId: targetUserId },
        data: { activitiesJoinedCount: { decrement: 1 } },
      });
    });

    await this.membership.removeFromChat(targetUserId, activityId);

    const username = target.user.profile?.username ?? 'someone';
    await this.messages.postSystemMessage(
      activityId,
      hostUserId,
      `host removed @${username}`,
    );
    void this.notifications.leave(activityId, targetUserId, true);
  }
}
