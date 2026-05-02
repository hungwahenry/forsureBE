import { Inject, Injectable } from '@nestjs/common';
import type { CursorPage } from '../../common/dto/pagination.dto';
import {
  decodeTsIdCursor,
  encodeTsIdCursor,
} from '../../common/utils/cursor';
import { PrismaService } from '../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../storage/storage.interface';
import { ExploreQueryDto } from './dto/explore.dto';
import { findPostsByIds, findPublicPostIds } from './explore.queries';
import {
  serializeExplorePost,
  type ExplorePostDto,
  type ExplorePostRow,
} from './explore.serializer';

const WINDOW_DAYS = 30;

@Injectable()
export class ExploreService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async listPublicPosts(
    query: ExploreQueryDto,
  ): Promise<CursorPage<ExplorePostDto>> {
    const cursor = query.cursor ? decodeTsIdCursor(query.cursor) : null;
    const limit = query.limit;

    const idRows = await findPublicPostIds(this.prisma, {
      lat: query.lat,
      lng: query.lng,
      radiusMeters: query.radiusKm * 1000,
      windowDays: WINDOW_DAYS,
      cursor,
      limit: limit + 1,
    });

    const hasMore = idRows.length > limit;
    const page = hasMore ? idRows.slice(0, limit) : idRows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeTsIdCursor({
            ts: last.createdAt.getTime(),
            id: last.id,
          })
        : null;

    if (page.length === 0) {
      return { items: [], pageInfo: { nextCursor, hasMore } };
    }

    const ids = page.map((r) => r.id);
    const rows = await findPostsByIds(this.prisma, ids);
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ordered = ids
      .map((id) => byId.get(id))
      .filter((r): r is ExplorePostRow => r !== undefined);

    return {
      items: ordered.map((r) => serializeExplorePost(this.storage, r)),
      pageInfo: { nextCursor, hasMore },
    };
  }
}
