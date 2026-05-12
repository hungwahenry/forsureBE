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
  serializeAdminUserPost,
  type AdminUserPostItem,
} from './posts.serializer';

@Injectable()
export class AdminUserPostsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async list(
    userId: string,
    query: CursorPaginationDto,
  ): Promise<CursorPage<AdminUserPostItem>> {
    const cursor = query.cursor ? decodeTsIdCursor(query.cursor) : null;

    const where: Prisma.ActivityPostWhereInput = {
      authorId: userId,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.ts) } },
              { createdAt: new Date(cursor.ts), id: { lt: cursor.id } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.activityPost.findMany({
      where,
      include: {
        activity: { select: { id: true, emoji: true, title: true } },
        photos: {
          take: 1,
          orderBy: { sortOrder: 'asc' },
          select: { imageKey: true },
        },
        _count: { select: { photos: true } },
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
      items: page.map((row) => serializeAdminUserPost(this.storage, row)),
      pageInfo: { nextCursor, hasMore },
    };
  }
}
