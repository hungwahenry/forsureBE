import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CursorPage } from '../../../../common/dto/pagination.dto';
import {
  decodeTsIdCursor,
  encodeTsIdCursor,
} from '../../../../common/utils/cursor';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../../storage/storage.interface';
import type { ListMessagesDto } from './dto/list-messages.dto';
import {
  serializeAdminMessageListItem,
  type AdminMessageListItem,
} from './list.serializer';

@Injectable()
export class AdminMessagesListService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async list(
    query: ListMessagesDto,
  ): Promise<CursorPage<AdminMessageListItem>> {
    const cursor = query.cursor ? decodeTsIdCursor(query.cursor) : null;

    const andClauses: Prisma.ChatMessageWhereInput[] = [];
    if (query.q) {
      andClauses.push({ body: { contains: query.q, mode: 'insensitive' } });
    }
    if (query.senderUserId) {
      andClauses.push({ senderUserId: query.senderUserId });
    }
    if (query.activityId) andClauses.push({ activityId: query.activityId });
    if (query.kind) andClauses.push({ kind: query.kind });
    if (!query.includeDeleted) andClauses.push({ deletedAt: null });
    if (cursor) {
      andClauses.push({
        OR: [
          { createdAt: { lt: new Date(cursor.ts) } },
          { createdAt: new Date(cursor.ts), id: { lt: cursor.id } },
        ],
      });
    }

    const where: Prisma.ChatMessageWhereInput =
      andClauses.length > 0 ? { AND: andClauses } : {};

    const rows = await this.prisma.chatMessage.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { username: true, displayName: true, avatarKey: true },
            },
          },
        },
        activity: { select: { id: true, emoji: true, title: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeTsIdCursor({ ts: last.createdAt.getTime(), id: last.id })
        : null;

    return {
      items: page.map((row) =>
        serializeAdminMessageListItem(this.storage, row),
      ),
      pageInfo: { nextCursor, hasMore },
    };
  }
}
