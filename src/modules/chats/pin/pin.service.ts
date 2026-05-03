import { Injectable } from '@nestjs/common';
import { ActivityRole } from '@prisma/client';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeService } from '../../../realtime/realtime.service';
import { ChatNotifications } from '../../notifications/producers/chat.producer';
import { ChatEvents, chatRoom } from '../chats.events';
import { MembershipService } from '../membership/membership.service';

@Injectable()
export class PinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly membership: MembershipService,
    private readonly notifications: ChatNotifications,
  ) {}

  async pin(
    userId: string,
    activityId: string,
    messageId: string,
  ): Promise<void> {
    const membership = await this.membership.requireChatMembership(
      userId,
      activityId,
    );
    if (membership.role !== ActivityRole.HOST) {
      throw new AppException(ErrorCode.AUTH_FORBIDDEN, {
        message: 'Only the host can pin messages.',
      });
    }
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { activityId: true },
    });
    if (!message || message.activityId !== activityId) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
    }
    await this.prisma.activity.update({
      where: { id: activityId },
      data: { pinnedMessageId: messageId },
    });
    this.realtime.toRoom(chatRoom(activityId), ChatEvents.ActivityUpdated, {
      activityId,
    });
    void this.notifications.pinned(activityId, messageId, userId);
  }

  async unpin(userId: string, activityId: string): Promise<void> {
    const membership = await this.membership.requireChatMembership(
      userId,
      activityId,
    );
    if (membership.role !== ActivityRole.HOST) {
      throw new AppException(ErrorCode.AUTH_FORBIDDEN, {
        message: 'Only the host can unpin messages.',
      });
    }
    await this.prisma.activity.update({
      where: { id: activityId },
      data: { pinnedMessageId: null },
    });
    this.realtime.toRoom(chatRoom(activityId), ChatEvents.ActivityUpdated, {
      activityId,
    });
  }
}
