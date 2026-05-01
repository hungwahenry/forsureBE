import { Inject, Injectable } from '@nestjs/common';
import { ActivityRole, Prisma } from '@prisma/client';
import type { CursorPage } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../storage/storage.interface';
import { ExploreQueryDto } from './dto/explore.dto';
import { decodeExploreCursor, encodeExploreCursor } from './explore.cursor';
import {
  serializeExplorePost,
  type ExplorePostDto,
  type ExplorePostRow,
} from './explore.serializer';

const WINDOW_DAYS = 30;

interface IdRow {
  id: string;
  createdAt: Date;
}

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
    const cursor = query.cursor ? decodeExploreCursor(query.cursor) : null;
    const radiusMeters = query.radiusKm * 1000;
    const limit = query.limit;

    const idRows = await this.prisma.$queryRaw<IdRow[]>`
      SELECT p.id, p."createdAt"
      FROM "ActivityPost" p
      JOIN "Activity" a ON a.id = p."activityId"
      WHERE p.visibility = 'PUBLIC'
        AND a.status = 'DONE'
        AND a."memoriesShareablePublicly" = true
        AND p."createdAt" >= NOW() - (${WINDOW_DAYS} || ' days')::interval
        AND ST_DWithin(
          a."placePoint",
          ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography,
          ${radiusMeters}
        )
        ${
          cursor
            ? Prisma.sql`AND (p."createdAt", p.id) < (to_timestamp(${cursor.createdAtMs} / 1000.0), ${cursor.id})`
            : Prisma.empty
        }
      ORDER BY p."createdAt" DESC, p.id DESC
      LIMIT ${limit + 1}
    `;

    const hasMore = idRows.length > limit;
    const page = hasMore ? idRows.slice(0, limit) : idRows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeExploreCursor({
            createdAtMs: last.createdAt.getTime(),
            id: last.id,
          })
        : null;

    if (page.length === 0) {
      return { items: [], pageInfo: { nextCursor, hasMore } };
    }

    const ids = page.map((r) => r.id);
    const rows = (await this.prisma.activityPost.findMany({
      where: { id: { in: ids } },
      include: {
        photos: true,
        author: { include: { profile: true } },
        activity: {
          select: {
            id: true,
            emoji: true,
            title: true,
            startsAt: true,
            placeName: true,
            participants: {
              where: { role: ActivityRole.HOST },
              select: {
                user: {
                  select: { profile: { select: { username: true } } },
                },
              },
              take: 1,
            },
          },
        },
      },
    })) as ExplorePostRow[];

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
