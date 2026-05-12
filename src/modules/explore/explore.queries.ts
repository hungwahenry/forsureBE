import { Prisma } from '@prisma/client';
import type { TimestampIdCursor } from '../../common/utils/cursor';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ExplorePostRow } from './explore.serializer';

export interface IdRow {
  id: string;
  createdAt: Date;
}

interface FindPublicPostIdsArgs {
  viewerUserId: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  windowDays: number;
  cursor: TimestampIdCursor | null;
  limit: number;
}

export async function findPublicPostIds(
  prisma: PrismaService,
  args: FindPublicPostIdsArgs,
): Promise<IdRow[]> {
  const { viewerUserId, lat, lng, radiusMeters, windowDays, cursor, limit } =
    args;
  return prisma.$queryRaw<IdRow[]>`
    SELECT p.id, p."createdAt"
    FROM "ActivityPost" p
    JOIN "Activity" a ON a.id = p."activityId"
    WHERE p.visibility = 'PUBLIC'
      AND a.status = 'DONE'
      AND a."memoriesShareablePublicly" = true
      AND p."deletedAt" IS NULL
      AND a."deletedAt" IS NULL
      AND p."createdAt" >= NOW() - (${windowDays} || ' days')::interval
      AND ST_DWithin(
        a."placePoint",
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusMeters}
      )
      AND NOT EXISTS (
        SELECT 1 FROM "UserBlock" b
        WHERE (b."blockerId" = ${viewerUserId} AND b."blockedId" = p."authorId")
           OR (b."blockerId" = p."authorId" AND b."blockedId" = ${viewerUserId})
      )
      ${
        cursor
          ? Prisma.sql`AND (p."createdAt", p.id) < (to_timestamp(${cursor.ts} / 1000.0), ${cursor.id})`
          : Prisma.empty
      }
    ORDER BY p."createdAt" DESC, p.id DESC
    LIMIT ${limit}
  `;
}

export async function findPostsByIds(
  prisma: PrismaService,
  ids: string[],
): Promise<ExplorePostRow[]> {
  return await prisma.activityPost.findMany({
    where: { id: { in: ids }, deletedAt: null },
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
          participantCount: true,
          participants: {
            select: {
              role: true,
              user: {
                select: {
                  profile: {
                    select: { username: true, avatarKey: true },
                  },
                },
              },
            },
            // role 'HOST' sorts before 'MEMBER' alphabetically — host comes first.
            orderBy: [{ role: 'asc' }, { joinedAt: 'desc' }],
            take: 3,
          },
        },
      },
    },
  });
}
