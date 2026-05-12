import { Inject, Injectable } from '@nestjs/common';
import { ActivityRole, ActivityStatus, ChatMessageKind } from '@prisma/client';
import { ErrorCode } from '../../../common/constants/error-codes';
import type { CursorPage } from '../../../common/dto/pagination.dto';
import { AppException } from '../../../common/exceptions/app.exception';
import { createId } from '../../../common/utils/id';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeService } from '../../../realtime/realtime.service';
import { STORAGE_PROVIDER_TOKEN } from '../../../storage/storage.interface';
import type { StorageProvider } from '../../../storage/storage.interface';
import {
  decodeTsIdCursor,
  encodeTsIdCursor,
} from '../../../common/utils/cursor';
import { BlocksService } from '../../blocks/blocks.service';
import { ChatNotifications } from '../../notifications/producers/chat.producer';
import { ChatEvents, chatRoom } from '../chats.events';
import type { UploadedImageFile } from '../chats.interface';
import { MembershipService } from '../membership/membership.service';
import { ListMessagesDto } from './dto/list-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { processAndStoreChatImage } from './messages.images';
import * as queries from './messages.queries';
import { serializeMessage, type ChatMessageDto } from './messages.serializer';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
    private readonly realtime: RealtimeService,
    private readonly membership: MembershipService,
    private readonly notifications: ChatNotifications,
    private readonly blocks: BlocksService,
  ) {}

  async listMessages(
    userId: string,
    activityId: string,
    dto: ListMessagesDto,
  ): Promise<CursorPage<ChatMessageDto>> {
    await this.membership.requireChatMembership(userId, activityId);

    const cursor = dto.cursor ? decodeTsIdCursor(dto.cursor) : null;
    const blockedSenderIds = await this.blocks.listEitherBlockedUserIds(userId);
    const rows = await queries.findMessagesPage(
      this.prisma,
      activityId,
      cursor,
      dto.limit + 1,
      blockedSenderIds,
    );

    const hasMore = rows.length > dto.limit;
    const page = hasMore ? rows.slice(0, dto.limit) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeTsIdCursor({
            ts: last.createdAt.getTime(),
            id: last.id,
          })
        : null;

    return {
      items: page.map((m) => serializeMessage(this.storage, m)),
      pageInfo: { nextCursor, hasMore },
    };
  }

  async sendMessage(
    userId: string,
    activityId: string,
    dto: SendMessageDto,
    file?: UploadedImageFile,
  ): Promise<ChatMessageDto> {
    await this.membership.requireChatMembership(userId, activityId);

    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { status: true, deletedAt: true },
    });
    if (!activity || activity.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
    }
    if (
      activity.status === ActivityStatus.CANCELLED ||
      activity.status === ActivityStatus.DONE
    ) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'This chat is read-only.',
      });
    }

    const trimmedBody = dto.body?.trim();
    if (!trimmedBody && !file) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'Message must include text or an image.',
      });
    }

    if (await this.hasBlockingParticipant(userId, activityId)) {
      throw new AppException(ErrorCode.AUTH_FORBIDDEN, {
        message: "You can't send messages here.",
      });
    }

    if (dto.parentMessageId) {
      const parentActivityId = await queries.findReplyTargetActivityId(
        this.prisma,
        dto.parentMessageId,
      );
      if (parentActivityId !== activityId) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, {
          message: 'Reply target not found.',
        });
      }
    }

    const imageKey = file
      ? await processAndStoreChatImage(this.storage, activityId, file)
      : null;

    const created = await queries.createMessage(this.prisma, {
      id: createId('msg'),
      activityId,
      senderUserId: userId,
      body: trimmedBody || null,
      imageKey,
      parentMessageId: dto.parentMessageId ?? null,
    });

    // Increment denormalized counts (fire-and-forget — non-critical).
    void Promise.all([
      this.prisma.profile.update({
        where: { userId },
        data: { messagesSentCount: { increment: 1 } },
      }),
      this.prisma.activity.update({
        where: { id: activityId },
        data: { messageCount: { increment: 1 } },
      }),
    ]).catch(() => undefined);

    const dtoOut = serializeMessage(this.storage, created);
    this.realtime.toRoom(chatRoom(activityId), ChatEvents.MessageNew, {
      message: dtoOut,
    });
    void this.notifications.chatMessage(created.id);
    return dtoOut;
  }

  /**
   * Returns true if any other participant in the activity has either blocked
   * the sender or been blocked by them. Used to gate sendMessage so blocked
   * pairs can't talk through a shared activity chat.
   */
  private async hasBlockingParticipant(
    senderUserId: string,
    activityId: string,
  ): Promise<boolean> {
    const others = await this.prisma.activityParticipant.findMany({
      where: { activityId, userId: { not: senderUserId } },
      select: { userId: true },
    });
    for (const p of others) {
      if (await this.blocks.isEitherBlocked(senderUserId, p.userId)) {
        return true;
      }
    }
    return false;
  }

  async deleteMessage(
    userId: string,
    activityId: string,
    messageId: string,
  ): Promise<void> {
    const membership = await this.membership.requireChatMembership(
      userId,
      activityId,
    );

    const message = await queries.findMessageBasics(this.prisma, messageId);
    if (!message || message.activityId !== activityId) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
    }

    const isSender = message.senderUserId === userId;
    const isHost = membership.role === ActivityRole.HOST;
    if (!isSender && !isHost) {
      throw new AppException(ErrorCode.AUTH_FORBIDDEN, {
        message: 'Only the sender or the host can delete a message.',
      });
    }

    await queries.deleteMessage(this.prisma, messageId);
    if (message.imageKey) {
      await this.storage.delete(message.imageKey).catch(() => undefined);
    }
    this.realtime.toRoom(chatRoom(activityId), ChatEvents.MessageDeleted, {
      activityId,
      messageId,
    });
  }

  async markRead(userId: string, activityId: string): Promise<void> {
    await this.membership.requireChatMembership(userId, activityId);
    await queries.setLastRead(this.prisma, {
      activityId,
      userId,
      at: new Date(),
    });
  }

  async postSystemMessage(
    activityId: string,
    senderUserId: string,
    body: string,
  ): Promise<ChatMessageDto> {
    const created = await queries.createMessage(this.prisma, {
      id: createId('msg'),
      activityId,
      senderUserId,
      kind: ChatMessageKind.SYSTEM,
      body,
      imageKey: null,
      parentMessageId: null,
    });
    const dtoOut = serializeMessage(this.storage, created);
    this.realtime.toRoom(chatRoom(activityId), ChatEvents.MessageNew, {
      message: dtoOut,
    });
    return dtoOut;
  }
}
