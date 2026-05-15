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
import type { ListActivitiesDto } from './dto/list-activities.dto';
import {
  serializeAdminActivityListItem,
  type AdminActivityListItem,
} from './list.serializer';

@Injectable()
export class AdminActivitiesListService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async list(
    query: ListActivitiesDto,
  ): Promise<CursorPage<AdminActivityListItem>> {
    const cursor = query.cursor ? decodeTsIdCursor(query.cursor) : null;

    const andClauses: Prisma.ActivityWhereInput[] = [];
    if (query.q) {
      andClauses.push({ title: { contains: query.q, mode: 'insensitive' } });
    }
    if (query.status) andClauses.push({ status: query.status });
    if (query.hostId) {
      andClauses.push({
        participants: { some: { userId: query.hostId, role: 'HOST' } },
      });
    }
    if (!query.includeDeleted) andClauses.push({ deletedAt: null });
    if (query.from) andClauses.push({ startsAt: { gte: query.from } });
    if (query.to) andClauses.push({ startsAt: { lte: query.to } });
    if (cursor) {
      andClauses.push({
        OR: [
          { createdAt: { lt: new Date(cursor.ts) } },
          { createdAt: new Date(cursor.ts), id: { lt: cursor.id } },
        ],
      });
    }

    const where: Prisma.ActivityWhereInput =
      andClauses.length > 0 ? { AND: andClauses } : {};

    const rows = await this.prisma.activity.findMany({
      where,
      include: {
        participants: {
          where: { role: 'HOST' },
          take: 1,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    username: true,
                    displayName: true,
                    avatarKey: true,
                  },
                },
              },
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
        serializeAdminActivityListItem(this.storage, row),
      ),
      pageInfo: { nextCursor, hasMore },
    };
  }
}
