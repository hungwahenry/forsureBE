import { Inject, Injectable } from '@nestjs/common';
import { ActivityRole } from '@prisma/client';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { PrismaService } from '../../../prisma/prisma.service';
import { STORAGE_PROVIDER_TOKEN } from '../../../storage/storage.interface';
import type { StorageProvider } from '../../../storage/storage.interface';
import { MembershipService } from '../../chats/membership/membership.service';
import { messageInclude } from '../../chats/messages/messages.queries';
import { serializeMessage } from '../../chats/messages/messages.serializer';
import type {
  ActivityDetailsDto,
  ActivityParticipantDto,
} from './details.interface';

@Injectable()
export class ActivityDetailsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
    private readonly membership: MembershipService,
  ) {}

  async getDetails(
    userId: string,
    activityId: string,
  ): Promise<ActivityDetailsDto> {
    await this.membership.requireChatMembership(userId, activityId);

    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        participants: {
          include: { user: { include: { profile: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        pinnedMessage: { include: messageInclude },
      },
    });
    if (!activity) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
    }

    const host = activity.participants.find(
      (p) => p.role === ActivityRole.HOST,
    );
    if (!host) {
      throw new AppException(ErrorCode.INTERNAL_ERROR, {
        message: 'Activity is missing a host participant.',
      });
    }
    const members = activity.participants.filter(
      (p) => p.role === ActivityRole.MEMBER,
    );

    return {
      id: activity.id,
      emoji: activity.emoji,
      title: activity.title,
      startsAt: activity.startsAt.toISOString(),
      place: {
        name: activity.placeName,
        lat: activity.placeLat,
        lng: activity.placeLng,
      },
      capacity: activity.capacity,
      participantCount: activity.participantCount,
      genderPreference: activity.genderPreference,
      status: activity.status,
      host: this.serializeParticipant(host),
      members: members.map((m) => this.serializeParticipant(m)),
      pinnedMessage: activity.pinnedMessage
        ? serializeMessage(this.storage, activity.pinnedMessage)
        : null,
    };
  }

  private serializeParticipant(p: {
    userId: string;
    joinedAt: Date;
    user: {
      profile: {
        username: string;
        displayName: string;
        avatarKey: string;
      } | null;
    };
  }): ActivityParticipantDto {
    if (!p.user.profile) {
      throw new AppException(ErrorCode.INTERNAL_ERROR, {
        message: 'Participant is missing a profile.',
      });
    }
    return {
      userId: p.userId,
      username: p.user.profile.username,
      displayName: p.user.profile.displayName,
      avatarUrl: this.storage.publicUrl(p.user.profile.avatarKey),
      joinedAt: p.joinedAt.toISOString(),
    };
  }
}
