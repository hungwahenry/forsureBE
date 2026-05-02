import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { PrismaService } from '../../../prisma/prisma.service';
import { STORAGE_PROVIDER_TOKEN } from '../../../storage/storage.interface';
import type { StorageProvider } from '../../../storage/storage.interface';
import { MembershipService } from '../../chats/membership/membership.service';
import { messageInclude } from '../../chats/messages/messages.queries';
import {
  serializeActivityDetails,
  type ActivityDetailsDto,
  type ActivityWithRelations,
} from './details.serializer';

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

    const activity = (await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        participants: {
          include: { user: { include: { profile: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        pinnedMessage: { include: messageInclude },
      },
    })) as ActivityWithRelations | null;

    if (!activity) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
    }

    return serializeActivityDetails(this.storage, activity);
  }
}
