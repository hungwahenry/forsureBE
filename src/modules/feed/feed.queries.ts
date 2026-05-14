import { type ActivityGenderPreference, Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { FeedCursor } from './feed.cursor';
import type { FeedRow } from './feed.interface';

interface BoostRowRaw extends Omit<FeedRow, 'boost'> {
  boostId: string;
  boostBusinessId: string;
  boostBusinessName: string;
  boostBusinessLogoKey: string | null;
}

interface FindFeedArgs {
  viewerUserId: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  visibleGenderPrefs: ActivityGenderPreference[];
  cursor: FeedCursor | null;
  limit: number;
}

export async function findFeedPage(
  prisma: PrismaService,
  args: FindFeedArgs,
): Promise<FeedRow[]> {
  const {
    viewerUserId,
    lat,
    lng,
    radiusMeters,
    visibleGenderPrefs,
    cursor,
    limit,
  } = args;

  return prisma.$queryRaw<FeedRow[]>`
    SELECT
      a.id,
      a.emoji,
      a.title,
      a."startsAt",
      a."placeName",
      a."placeLat",
      a."placeLng",
      a.capacity,
      a."genderPreference",
      a."participantCount",
      host."userId" AS "hostUserId",
      prof.username AS "hostUsername",
      prof."displayName" AS "hostDisplayName",
      prof."avatarKey" AS "hostAvatarKey",
      (
        SELECT array_agg(av) FROM (
          SELECT pp."avatarKey" AS av
          FROM "ActivityParticipant" ap
          JOIN "Profile" pp ON pp."userId" = ap."userId"
          WHERE ap."activityId" = a.id AND ap."role" = 'MEMBER'
          ORDER BY ap."joinedAt" DESC
          LIMIT 3
        ) sub
      ) AS "participantAvatarKeys",
      ST_Distance(
        a."placePoint",
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      ) / 1000.0 AS "distanceKm",
      FLOOR(EXTRACT(EPOCH FROM a."startsAt") / 43200)::int AS bucket
    FROM "Activity" a
    JOIN "ActivityParticipant" host
      ON host."activityId" = a.id AND host."role" = 'HOST'
    JOIN "Profile" prof ON prof."userId" = host."userId"
    WHERE a.status = 'OPEN'
      AND a."startsAt" >= NOW() + INTERVAL '30 minutes'
      AND a."startsAt" <= NOW() + INTERVAL '25 days'
      AND a."genderPreference" = ANY(${visibleGenderPrefs}::"ActivityGenderPreference"[])
      AND ST_DWithin(
        a."placePoint",
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusMeters}
      )
      AND NOT EXISTS (
        SELECT 1 FROM "ActivityParticipant" vp
        WHERE vp."activityId" = a.id AND vp."userId" = ${viewerUserId}
      )
      AND NOT EXISTS (
        SELECT 1 FROM "UserBlock" b
        WHERE (b."blockerId" = ${viewerUserId} AND b."blockedId" = host."userId")
           OR (b."blockerId" = host."userId" AND b."blockedId" = ${viewerUserId})
      )
      AND a."participantCount" < a.capacity
      ${
        cursor
          ? Prisma.sql`AND (
            FLOOR(EXTRACT(EPOCH FROM a."startsAt") / 43200)::int,
            ST_Distance(a."placePoint", ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) / 1000.0,
            a.id
          ) > (${cursor.bucket}, ${cursor.distanceKm}, ${cursor.id})`
          : Prisma.empty
      }
    ORDER BY bucket ASC, "distanceKm" ASC, a.id ASC
    LIMIT ${limit}
  `;
}

interface FindActiveBoostsArgs {
  viewerUserId: string;
  lat: number;
  lng: number;
  /** Viewer's chosen feed radius — boost results must respect this too. */
  viewerRadiusMeters: number;
  visibleGenderPrefs: ActivityGenderPreference[];
  limit: number;
}

export async function findActiveBoosts(
  prisma: PrismaService,
  args: FindActiveBoostsArgs,
): Promise<FeedRow[]> {
  const { viewerUserId, lat, lng, viewerRadiusMeters, visibleGenderPrefs, limit } =
    args;

  const rows = await prisma.$queryRaw<BoostRowRaw[]>`
    SELECT
      a.id,
      a.emoji,
      a.title,
      a."startsAt",
      a."placeName",
      a."placeLat",
      a."placeLng",
      a.capacity,
      a."genderPreference",
      a."participantCount",
      host."userId" AS "hostUserId",
      prof.username AS "hostUsername",
      prof."displayName" AS "hostDisplayName",
      prof."avatarKey" AS "hostAvatarKey",
      (
        SELECT array_agg(av) FROM (
          SELECT pp."avatarKey" AS av
          FROM "ActivityParticipant" ap
          JOIN "Profile" pp ON pp."userId" = ap."userId"
          WHERE ap."activityId" = a.id AND ap."role" = 'MEMBER'
          ORDER BY ap."joinedAt" DESC
          LIMIT 3
        ) sub
      ) AS "participantAvatarKeys",
      ST_Distance(
        a."placePoint",
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      ) / 1000.0 AS "distanceKm",
      FLOOR(EXTRACT(EPOCH FROM a."startsAt") / 43200)::int AS bucket,
      abt.id          AS "boostId",
      biz.id          AS "boostBusinessId",
      biz.name        AS "boostBusinessName",
      biz."logoKey"   AS "boostBusinessLogoKey"
    FROM "ActivityBoost" abt
    JOIN "Activity" a ON a.id = abt."activityId"
    JOIN "Business" biz ON biz.id = abt."businessId"
    JOIN "ActivityParticipant" host
      ON host."activityId" = a.id AND host."role" = 'HOST'
    JOIN "Profile" prof ON prof."userId" = host."userId"
    WHERE abt."cancelledAt" IS NULL
      AND abt."startsAt" <= NOW()
      AND abt."endsAt" > NOW()
      AND biz."verifiedAt" IS NOT NULL
      AND biz."suspendedAt" IS NULL
      AND biz."autoPausedAt" IS NULL
      AND a.status = 'OPEN'
      AND a."deletedAt" IS NULL
      AND a."startsAt" >= NOW() + INTERVAL '30 minutes'
      AND a."participantCount" < a.capacity
      AND a."genderPreference" = ANY(${visibleGenderPrefs}::"ActivityGenderPreference"[])
      AND ST_DWithin(
        a."placePoint",
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        LEAST(${viewerRadiusMeters}::integer, abt."radiusM")
      )
      AND NOT EXISTS (
        SELECT 1 FROM "ActivityParticipant" vp
        WHERE vp."activityId" = a.id AND vp."userId" = ${viewerUserId}
      )
      AND NOT EXISTS (
        SELECT 1 FROM "UserBlock" b
        WHERE (b."blockerId" = ${viewerUserId} AND b."blockedId" = host."userId")
           OR (b."blockerId" = host."userId" AND b."blockedId" = ${viewerUserId})
      )
    ORDER BY "distanceKm" ASC, a.id ASC
    LIMIT ${limit}
  `;

  return rows.map(
    ({ boostId, boostBusinessId, boostBusinessName, boostBusinessLogoKey, ...row }) => ({
      ...row,
      boost: {
        boostId,
        businessId: boostBusinessId,
        businessName: boostBusinessName,
        businessLogoKey: boostBusinessLogoKey,
      },
    }),
  );
}
