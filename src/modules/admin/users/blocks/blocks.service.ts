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
import { BlockDirection, ListUserBlocksDto } from './dto/list-user-blocks.dto';
import {
  serializeAdminUserBlock,
  type AdminUserBlockItem,
} from './blocks.serializer';

const COUNTERPARTY_INCLUDE = {
  select: {
    id: true,
    email: true,
    profile: {
      select: { username: true, displayName: true, avatarKey: true },
    },
  },
} as const;

@Injectable()
export class AdminUserBlocksService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async list(
    userId: string,
    query: ListUserBlocksDto,
  ): Promise<CursorPage<AdminUserBlockItem>> {
    const cursor = query.cursor ? decodeTsIdCursor(query.cursor) : null;

    const directionFilter: Prisma.UserBlockWhereInput =
      query.direction === BlockDirection.RECEIVED
        ? { blockedId: userId }
        : { blockerId: userId };

    const where: Prisma.UserBlockWhereInput = {
      ...directionFilter,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.ts) } },
              { createdAt: new Date(cursor.ts), id: { lt: cursor.id } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.userBlock.findMany({
      where,
      include: {
        blocker: COUNTERPARTY_INCLUDE,
        blocked: COUNTERPARTY_INCLUDE,
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
        serializeAdminUserBlock(this.storage, row, query.direction),
      ),
      pageInfo: { nextCursor, hasMore },
    };
  }
}
