import { forwardRef, Inject, Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { ErrorCode } from '../../common/constants/error-codes';
import type { CursorPage } from '../../common/dto/pagination.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { createId } from '../../common/utils/id';
import { PrismaService } from '../../prisma/prisma.service';
import { STORAGE_PROVIDER_TOKEN } from '../../storage/storage.interface';
import type { StorageProvider } from '../../storage/storage.interface';
import { ChatsGateway } from './chats.gateway';
import type { ChatMessageDto, ChatPreviewDto } from './chats.interface';
import { ListMessagesDto } from './dto/list-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { decodeMessageCursor, encodeMessageCursor } from './utils/cursor';
import { requireChatMembership } from './utils/membership';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IMAGE_MAX_DIMENSION = 1920;

interface UploadedImageFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

@Injectable()
export class ChatsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
    @Inject(forwardRef(() => ChatsGateway))
    private readonly gateway: ChatsGateway,
  ) {}

  async listChats(userId: string): Promise<ChatPreviewDto[]> {
    // Activities the user hosts OR participates in.
    const activities = await this.prisma.activity.findMany({
      where: {
        OR: [{ authorUserId: userId }, { participants: { some: { userId } } }],
      },
      select: {
        id: true,
        title: true,
        emoji: true,
        startsAt: true,
        authorUserId: true,
        hostLastReadAt: true,
        participants: {
          where: { userId },
          select: { lastReadAt: true },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (activities.length === 0) return [];

    const activityIds = activities.map((a) => a.id);

    // Last message per activity (one round-trip via DISTINCT ON).
    const lastMessages = await this.prisma.$queryRaw<
      {
        activityId: string;
        id: string;
        body: string | null;
        imageKey: string | null;
        createdAt: Date;
        senderUsername: string;
      }[]
    >`
      SELECT DISTINCT ON (m."activityId")
        m."activityId",
        m.id,
        m.body,
        m."imageKey",
        m."createdAt",
        prof.username AS "senderUsername"
      FROM "ChatMessage" m
      JOIN "Profile" prof ON prof."userId" = m."senderUserId"
      WHERE m."activityId" = ANY(${activityIds}::text[])
      ORDER BY m."activityId", m."createdAt" DESC, m.id DESC
    `;
    const lastByActivity = new Map(lastMessages.map((m) => [m.activityId, m]));

    // Unread counts per activity, computed against the user's lastReadAt.
    const previews: ChatPreviewDto[] = [];
    for (const a of activities) {
      const isHost = a.authorUserId === userId;
      const lastReadAt = isHost
        ? a.hostLastReadAt
        : (a.participants[0]?.lastReadAt ?? null);

      const unreadCount = await this.prisma.chatMessage.count({
        where: {
          activityId: a.id,
          senderUserId: { not: userId },
          ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
        },
      });

      const last = lastByActivity.get(a.id) ?? null;
      previews.push({
        activityId: a.id,
        title: a.title,
        emoji: a.emoji,
        startsAt: a.startsAt.toISOString(),
        hostUserId: a.authorUserId,
        unreadCount,
        lastMessage: last
          ? {
              id: last.id,
              body: last.body,
              hasImage: last.imageKey != null,
              createdAt: last.createdAt.toISOString(),
              senderUsername: last.senderUsername,
            }
          : null,
      });
    }
    return previews;
  }

  async listMessages(
    userId: string,
    activityId: string,
    dto: ListMessagesDto,
  ): Promise<CursorPage<ChatMessageDto>> {
    await requireChatMembership(this.prisma, userId, activityId);

    const cursor = dto.cursor ? decodeMessageCursor(dto.cursor) : null;
    const limit = dto.limit;

    const rows = await this.prisma.chatMessage.findMany({
      where: {
        activityId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: new Date(cursor.createdAtMs) } },
                {
                  AND: [
                    { createdAt: new Date(cursor.createdAtMs) },
                    { id: { lt: cursor.id } },
                  ],
                },
              ],
            }
          : {}),
      },
      include: {
        sender: { include: { profile: true } },
        parent: { include: { sender: { include: { profile: true } } } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeMessageCursor({
            createdAtMs: last.createdAt.getTime(),
            id: last.id,
          })
        : null;

    const items = page.map((m) => this.serialize(m));
    return { items, pageInfo: { nextCursor, hasMore } };
  }

  async sendMessage(
    userId: string,
    activityId: string,
    dto: SendMessageDto,
    file?: UploadedImageFile,
  ): Promise<ChatMessageDto> {
    await requireChatMembership(this.prisma, userId, activityId);

    const trimmedBody = dto.body?.trim();
    const hasBody = !!trimmedBody;
    const hasImage = !!file;
    if (!hasBody && !hasImage) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'Message must include text or an image.',
      });
    }

    // Optional reply target — must be in the same chat.
    if (dto.parentMessageId) {
      const parent = await this.prisma.chatMessage.findUnique({
        where: { id: dto.parentMessageId },
        select: { activityId: true },
      });
      if (!parent || parent.activityId !== activityId) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, {
          message: 'Reply target not found.',
        });
      }
    }

    let imageKey: string | null = null;
    if (file) {
      imageKey = await this.processAndStoreImage(activityId, file);
    }

    const id = createId('msg');
    await this.prisma.chatMessage.create({
      data: {
        id,
        activityId,
        senderUserId: userId,
        body: hasBody ? trimmedBody : null,
        imageKey,
        parentMessageId: dto.parentMessageId ?? null,
      },
    });

    const created = await this.prisma.chatMessage.findUniqueOrThrow({
      where: { id },
      include: {
        sender: { include: { profile: true } },
        parent: { include: { sender: { include: { profile: true } } } },
      },
    });
    const dtoOut = this.serialize(created);
    this.gateway.broadcastNewMessage(activityId, dtoOut);
    return dtoOut;
  }

  async deleteMessage(
    userId: string,
    activityId: string,
    messageId: string,
  ): Promise<void> {
    const membership = await requireChatMembership(
      this.prisma,
      userId,
      activityId,
    );

    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { activityId: true, senderUserId: true, imageKey: true },
    });
    if (!message || message.activityId !== activityId) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
    }

    const isSender = message.senderUserId === userId;
    const isHost = membership.role === 'host';
    if (!isSender && !isHost) {
      throw new AppException(ErrorCode.AUTH_FORBIDDEN, {
        message: 'Only the sender or the host can delete a message.',
      });
    }

    await this.prisma.chatMessage.delete({ where: { id: messageId } });
    if (message.imageKey) {
      await this.storage.delete(message.imageKey).catch(() => undefined);
    }
    this.gateway.broadcastDeletedMessage(activityId, messageId);
  }

  async markRead(userId: string, activityId: string): Promise<void> {
    const membership = await requireChatMembership(
      this.prisma,
      userId,
      activityId,
    );
    const now = new Date();
    if (membership.role === 'host') {
      await this.prisma.activity.update({
        where: { id: activityId },
        data: { hostLastReadAt: now },
      });
    } else {
      await this.prisma.activityParticipant.update({
        where: { activityId_userId: { activityId, userId } },
        data: { lastReadAt: now },
      });
    }
  }

  // ----- helpers -----

  private async processAndStoreImage(
    activityId: string,
    file: UploadedImageFile,
  ): Promise<string> {
    if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'Image must be JPEG, PNG, or WEBP.',
      });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'Image exceeds 10MB.',
      });
    }
    const processed = await sharp(file.buffer)
      .rotate()
      .resize(IMAGE_MAX_DIMENSION, IMAGE_MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

    const key = `chat-images/${activityId}/${createId('img')}.webp`;
    await this.storage.put(key, processed, {
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    });
    return key;
  }

  private serialize(m: {
    id: string;
    activityId: string;
    body: string | null;
    imageKey: string | null;
    createdAt: Date;
    sender: {
      id: string;
      profile: {
        username: string;
        displayName: string;
        avatarKey: string;
      } | null;
    };
    parent: {
      id: string;
      body: string | null;
      imageKey: string | null;
      sender: { id: string; profile: { username: string } | null };
    } | null;
  }): ChatMessageDto {
    if (!m.sender.profile) {
      throw new AppException(ErrorCode.INTERNAL_ERROR, {
        message: 'Message sender is missing a profile.',
      });
    }
    return {
      id: m.id,
      activityId: m.activityId,
      body: m.body,
      imageUrl: m.imageKey ? this.storage.publicUrl(m.imageKey) : null,
      createdAt: m.createdAt.toISOString(),
      sender: {
        id: m.sender.id,
        username: m.sender.profile.username,
        displayName: m.sender.profile.displayName,
        avatarUrl: this.storage.publicUrl(m.sender.profile.avatarKey),
      },
      parent: m.parent
        ? {
            id: m.parent.id,
            body: m.parent.body,
            hasImage: m.parent.imageKey != null,
            sender: {
              id: m.parent.sender.id,
              username: m.parent.sender.profile?.username ?? '',
            },
          }
        : null,
    };
  }
}
