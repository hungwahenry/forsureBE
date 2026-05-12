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
import type { ListPostsDto } from './dto/list-posts.dto';
import {
  serializeAdminPostListItem,
  type AdminPostListItem,
} from './list.serializer';

@Injectable()
export class AdminPostsListService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async list(query: ListPostsDto): Promise<CursorPage<AdminPostListItem>> {
    const cursor = query.cursor ? decodeTsIdCursor(query.cursor) : null;

    const andClauses: Prisma.ActivityPostWhereInput[] = [];
    if (query.q) {
      andClauses.push({ caption: { contains: query.q, mode: 'insensitive' } });
    }
    if (query.visibility) andClauses.push({ visibility: query.visibility });
    if (query.authorId) andClauses.push({ authorId: query.authorId });
    if (query.activityId) andClauses.push({ activityId: query.activityId });
    if (!query.includeDeleted) andClauses.push({ deletedAt: null });
    if (cursor) {
      andClauses.push({
        OR: [
          { createdAt: { lt: new Date(cursor.ts) } },
          { createdAt: new Date(cursor.ts), id: { lt: cursor.id } },
        ],
      });
    }

    const where: Prisma.ActivityPostWhereInput =
      andClauses.length > 0 ? { AND: andClauses } : {};

    const rows = await this.prisma.activityPost.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { username: true, displayName: true, avatarKey: true },
            },
          },
        },
        photos: {
          take: 1,
          orderBy: { sortOrder: 'asc' },
          select: { imageKey: true },
        },
        _count: { select: { photos: true } },
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
      items: page.map((row) => serializeAdminPostListItem(this.storage, row)),
      pageInfo: { nextCursor, hasMore },
    };
  }
}
