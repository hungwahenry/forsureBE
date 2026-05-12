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
import type { ListBlocksDto } from './dto/list-blocks.dto';
import {
  serializeAdminBlockListItem,
  type AdminBlockListItem,
} from './list.serializer';

const COUNTERPARTY_INCLUDE = {
  select: {
    id: true,
    email: true,
    profile: {
      select: { username: true, displayName: true, avatarKey: true },
    },
  },
} as const;

function userMatchFilter(q: string): Prisma.UserWhereInput {
  return {
    OR: [
      { id: q },
      { email: { contains: q, mode: 'insensitive' } },
      { profile: { username: { contains: q, mode: 'insensitive' } } },
      { profile: { displayName: { contains: q, mode: 'insensitive' } } },
    ],
  };
}

@Injectable()
export class AdminBlocksListService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async list(query: ListBlocksDto): Promise<CursorPage<AdminBlockListItem>> {
    const cursor = query.cursor ? decodeTsIdCursor(query.cursor) : null;

    const andClauses: Prisma.UserBlockWhereInput[] = [];
    if (query.blockerId) andClauses.push({ blockerId: query.blockerId });
    if (query.blockedId) andClauses.push({ blockedId: query.blockedId });
    if (query.q) {
      const match = userMatchFilter(query.q);
      andClauses.push({ OR: [{ blocker: match }, { blocked: match }] });
    }
    if (cursor) {
      andClauses.push({
        OR: [
          { createdAt: { lt: new Date(cursor.ts) } },
          { createdAt: new Date(cursor.ts), id: { lt: cursor.id } },
        ],
      });
    }

    const where: Prisma.UserBlockWhereInput =
      andClauses.length > 0 ? { AND: andClauses } : {};

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
      items: page.map((row) => serializeAdminBlockListItem(this.storage, row)),
      pageInfo: { nextCursor, hasMore },
    };
  }
}
