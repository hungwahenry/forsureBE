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
import type { ListBusinessesDto } from './dto/list-businesses.dto';
import {
  serializeAdminBusinessListItem,
  type AdminBusinessListItem,
} from './list.serializer';

@Injectable()
export class AdminBusinessesListService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async list(
    query: ListBusinessesDto,
  ): Promise<CursorPage<AdminBusinessListItem>> {
    const cursor = query.cursor ? decodeTsIdCursor(query.cursor) : null;

    const andClauses: Prisma.BusinessWhereInput[] = [];
    if (query.state === 'VERIFIED') {
      andClauses.push({ verifiedAt: { not: null }, suspendedAt: null });
    } else if (query.state === 'UNVERIFIED') {
      andClauses.push({ verifiedAt: null });
    } else if (query.state === 'SUSPENDED') {
      andClauses.push({ suspendedAt: { not: null } });
    }
    if (query.q) {
      andClauses.push({
        OR: [
          { id: query.q },
          { slug: { contains: query.q, mode: 'insensitive' } },
          { name: { contains: query.q, mode: 'insensitive' } },
        ],
      });
    }
    if (cursor) {
      andClauses.push({
        OR: [
          { createdAt: { lt: new Date(cursor.ts) } },
          { createdAt: new Date(cursor.ts), id: { lt: cursor.id } },
        ],
      });
    }

    const where: Prisma.BusinessWhereInput =
      andClauses.length > 0 ? { AND: andClauses } : {};

    const rows = await this.prisma.business.findMany({
      where,
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
        serializeAdminBusinessListItem(this.storage, row),
      ),
      pageInfo: { nextCursor, hasMore },
    };
  }
}
