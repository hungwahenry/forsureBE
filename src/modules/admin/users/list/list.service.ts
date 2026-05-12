import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CursorPage } from '../../../../common/dto/pagination.dto';
import { decodeTsIdCursor, encodeTsIdCursor } from '../../../../common/utils/cursor';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../../storage/storage.interface';
import type { ListUsersDto } from './dto/list-users.dto';
import {
  serializeAdminUserListItem,
  type AdminUserListItem,
} from './list.serializer';

@Injectable()
export class AdminUsersListService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async list(query: ListUsersDto): Promise<CursorPage<AdminUserListItem>> {
    const cursor = query.cursor ? decodeTsIdCursor(query.cursor) : null;

    const andClauses: Prisma.UserWhereInput[] = [];
    if (query.status) andClauses.push({ status: query.status });
    if (query.role) andClauses.push({ role: query.role });
    if (query.q) {
      andClauses.push({
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

    const where: Prisma.UserWhereInput =
      andClauses.length > 0 ? { AND: andClauses } : {};

    const rows = await this.prisma.user.findMany({
      where,
      include: {
        profile: {
          select: { username: true, displayName: true, avatarKey: true },
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
      items: page.map((row) => serializeAdminUserListItem(this.storage, row)),
      pageInfo: { nextCursor, hasMore },
    };
  }
}
