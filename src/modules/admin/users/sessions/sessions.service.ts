import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CursorPage } from '../../../../common/dto/pagination.dto';
import { CursorPaginationDto } from '../../../../common/dto/pagination.dto';
import {
  decodeTsIdCursor,
  encodeTsIdCursor,
} from '../../../../common/utils/cursor';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  serializeAdminUserSession,
  type AdminUserSessionItem,
} from './sessions.serializer';

@Injectable()
export class AdminUserSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    query: CursorPaginationDto,
  ): Promise<CursorPage<AdminUserSessionItem>> {
    const cursor = query.cursor ? decodeTsIdCursor(query.cursor) : null;

    const where: Prisma.RefreshTokenWhereInput = {
      userId,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.ts) } },
              { createdAt: new Date(cursor.ts), id: { lt: cursor.id } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.refreshToken.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });

    const now = new Date();
    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeTsIdCursor({ ts: last.createdAt.getTime(), id: last.id })
        : null;

    return {
      items: page.map((row) => serializeAdminUserSession(row, now)),
      pageInfo: { nextCursor, hasMore },
    };
  }
}
