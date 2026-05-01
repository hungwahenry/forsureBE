import { Injectable, OnModuleInit } from '@nestjs/common';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeService } from '../../../realtime/realtime.service';
import { ChatEvents, chatRoom } from '../chats.events';
import type { ChatMembership } from '../chats.interface';
import { findActivityIdsForUser } from './membership.queries';

@Injectable()
export class MembershipService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  onModuleInit() {
    this.realtime.onUserConnected(async (userId) => {
      const ids = await findActivityIdsForUser(this.prisma, userId);
      await Promise.all(
        ids.map((id) => this.realtime.joinUserToRoom(userId, chatRoom(id))),
      );
    });
  }

  async requireChatMembership(
    userId: string,
    activityId: string,
  ): Promise<ChatMembership> {
    const participant = await this.prisma.activityParticipant.findUnique({
      where: { activityId_userId: { activityId, userId } },
      select: { role: true },
    });
    if (!participant) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
    }
    return { activityId, role: participant.role };
  }

  async addToChat(userId: string, activityId: string): Promise<void> {
    await this.realtime.joinUserToRoom(userId, chatRoom(activityId));
  }

  async removeFromChat(userId: string, activityId: string): Promise<void> {
    await this.realtime.leaveUserFromRoom(userId, chatRoom(activityId));
    this.realtime.toUser(userId, ChatEvents.MemberRemoved, { activityId });
  }
}
