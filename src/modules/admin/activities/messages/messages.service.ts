import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CursorPage } from '../../../../common/dto/pagination.dto';
import { CursorPaginationDto } from '../../../../common/dto/pagination.dto';
import {
  decodeTsIdCursor,
  encodeTsIdCursor,
} from '../../../../common/utils/cursor';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../../storage/storage.interface';
import {
  serializeAdminActivityMessage,
  type AdminActivityMessageItem,
} from './messages.serializer';

@Injectable()
export class AdminActivityMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async list(
    activityId: string,
    query: CursorPaginationDto,
  ): Promise<CursorPage<AdminActivityMessageItem>> {
    const cursor = query.cursor ? decodeTsIdCursor(query.cursor) : null;

    const where: Prisma.ChatMessageWhereInput = {
      activityId,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.ts) } },
              { createdAt: new Date(cursor.ts), id: { lt: cursor.id } },
            ],
          }
        : {}),
    };

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
        serializeAdminActivityMessage(this.storage, row),
      ),
      pageInfo: { nextCursor, hasMore },
    };
  }
}
