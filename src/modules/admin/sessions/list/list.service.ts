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
import { ListSessionsDto, SessionStatus } from './dto/list-sessions.dto';
import {
  serializeAdminSessionListItem,
  type AdminSessionListItem,
} from './list.serializer';

@Injectable()
export class AdminSessionsListService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async list(
    query: ListSessionsDto,
  ): Promise<CursorPage<AdminSessionListItem>> {
    const cursor = query.cursor ? decodeTsIdCursor(query.cursor) : null;
    const now = new Date();

    const andClauses: Prisma.RefreshTokenWhereInput[] = [];
    if (query.userId) andClauses.push({ userId: query.userId });
    if (query.status === SessionStatus.ACTIVE) {
      andClauses.push({ revokedAt: null, expiresAt: { gt: now } });
    } else if (query.status === SessionStatus.REVOKED) {
      andClauses.push({ revokedAt: { not: null } });
    } else if (query.status === SessionStatus.EXPIRED) {
      andClauses.push({ revokedAt: null, expiresAt: { lte: now } });
    }
    if (query.q) {
      andClauses.push({
        OR: [
          { ipAddress: { contains: query.q, mode: 'insensitive' } },
          {
            user: {
              OR: [
                { id: query.q },
                { email: { contains: query.q, mode: 'insensitive' } },
                {
                  profile: {
                    username: { contains: query.q, mode: 'insensitive' },
                  },
                },
                {
                  profile: {
                    displayName: { contains: query.q, mode: 'insensitive' },
                  },
                },
              ],
            },
          },
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

    const where: Prisma.RefreshTokenWhereInput =
      andClauses.length > 0 ? { AND: andClauses } : {};

    const rows = await this.prisma.refreshToken.findMany({
      where,
      include: {
        user: {
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
        serializeAdminSessionListItem(this.storage, row, now),
      ),
      pageInfo: { nextCursor, hasMore },
    };
  }
}
