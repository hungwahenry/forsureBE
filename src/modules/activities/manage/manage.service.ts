import { Injectable } from '@nestjs/common';
import {
  ActivityRole,
  ActivityStatus,
  type Activity,
  type Prisma,
} from '@prisma/client';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { PrismaService } from '../../../prisma/prisma.service';
import { ChatEvents, chatRoom } from '../../chats/chats.events';
import { MembershipService } from '../../chats/membership/membership.service';
import { MessagesService } from '../../chats/messages/messages.service';
import { RealtimeService } from '../../../realtime/realtime.service';
import { EditActivityDto } from './dto/edit-activity.dto';

const MIN_LEAD_TIME_MS = 30 * 60_000;

@Injectable()
export class ManageActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly membership: MembershipService,
    private readonly messages: MessagesService,
  ) {}

  private async requireHost(
    userId: string,
    activityId: string,
  ): Promise<Activity> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity) {
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
  ): Promise<Activity> {
    const activity = await this.requireHost(userId, activityId);
    if (activity.status !== ActivityStatus.OPEN) {
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

    const updated = await this.prisma.activity.update({
      where: { id: activityId },
      data,
    });

    this.realtime.toRoom(chatRoom(activityId), ChatEvents.ActivityUpdated, {
      activityId,
    });
    return updated;
  }

  async cancel(userId: string, activityId: string): Promise<Activity> {
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
    return updated;
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

    await this.prisma.activityParticipant.delete({
      where: { activityId_userId: { activityId, userId: targetUserId } },
    });

    await this.membership.removeFromChat(targetUserId, activityId);

    const username = target.user.profile?.username ?? 'someone';
    await this.messages.postSystemMessage(
      activityId,
      hostUserId,
      `host removed @${username}`,
    );
  }
}
