import { Inject, Injectable } from '@nestjs/common';
import { ActivityGenderPreference, Gender } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { ErrorCode } from '../../common/constants/error-codes';
import type { CursorPage } from '../../common/dto/pagination.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { STORAGE_PROVIDER_TOKEN } from '../../storage/storage.interface';
import type { StorageProvider } from '../../storage/storage.interface';
import { FeedQueryDto } from './dto/feed.dto';
import type { FeedItem, FeedRow } from './feed.interface';
import { decodeFeedCursor, encodeFeedCursor } from './utils/cursor';

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async getFeed(
    viewerUserId: string,
    query: FeedQueryDto,
  ): Promise<CursorPage<FeedItem>> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId: viewerUserId },
      select: { gender: true },
    });
    if (!profile) {
      throw new AppException(ErrorCode.ONBOARDING_REQUIRED);
    }

    const cursor = query.cursor ? decodeFeedCursor(query.cursor) : null;
    const radiusMeters = query.radiusKm * 1000;
    const limit = query.limit;
    const visibleGenderPrefs = visibleGenderPreferencesFor(profile.gender);

    // Fetch limit + 1 to detect hasMore.
    const rows = await this.prisma.$queryRaw<FeedRow[]>`
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
        a."authorUserId",
        prof.username AS "hostUsername",
        prof."displayName" AS "hostDisplayName",
        prof."avatarKey" AS "hostAvatarKey",
        (SELECT COUNT(*)::int FROM "ActivityParticipant" p WHERE p."activityId" = a.id) AS "participantCount",
        (
          SELECT array_agg(av) FROM (
            SELECT pp."avatarKey" AS av
            FROM "ActivityParticipant" ap
            JOIN "Profile" pp ON pp."userId" = ap."userId"
            WHERE ap."activityId" = a.id
            ORDER BY ap."joinedAt" DESC
            LIMIT 3
          ) sub
        ) AS "participantAvatarKeys",
        ST_Distance(
          a."placePoint",
          ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography
        ) / 1000.0 AS "distanceKm",
        FLOOR(EXTRACT(EPOCH FROM a."startsAt") / 43200)::int AS bucket
      FROM "Activity" a
      JOIN "Profile" prof ON prof."userId" = a."authorUserId"
      WHERE a.status = 'OPEN'
        AND a."startsAt" >= NOW() + INTERVAL '30 minutes'
        AND a."startsAt" <= NOW() + INTERVAL '25 days'
        AND a."genderPreference" = ANY(${visibleGenderPrefs}::"ActivityGenderPreference"[])
        AND ST_DWithin(
          a."placePoint",
          ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography,
          ${radiusMeters}
        )
        AND NOT EXISTS (
          SELECT 1 FROM "ActivityParticipant" vp
          WHERE vp."activityId" = a.id AND vp."userId" = ${viewerUserId}
        )
        AND (SELECT COUNT(*) FROM "ActivityParticipant" p2 WHERE p2."activityId" = a.id) < a.capacity
        ${
          cursor
            ? Prisma.sql`AND (
              FLOOR(EXTRACT(EPOCH FROM a."startsAt") / 43200)::int,
              ST_Distance(a."placePoint", ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography) / 1000.0,
              a.id
            ) > (${cursor.bucket}, ${cursor.distanceKm}, ${cursor.id})`
            : Prisma.empty
        }
      ORDER BY bucket ASC, "distanceKm" ASC, a.id ASC
      LIMIT ${limit + 1}
    `;

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeFeedCursor({
            bucket: Number(last.bucket),
            distanceKm: Number(last.distanceKm),
            id: last.id,
          })
        : null;

    const items: FeedItem[] = page.map((r) => {
      const participantCount = Number(r.participantCount);
      return {
        id: r.id,
        emoji: r.emoji,
        title: r.title,
        startsAt: r.startsAt.toISOString(),
        place: { name: r.placeName, lat: r.placeLat, lng: r.placeLng },
        capacity: r.capacity,
        genderPreference: r.genderPreference,
        spotsLeft: r.capacity - participantCount,
        distanceKm: Number(r.distanceKm),
        host: {
          id: r.authorUserId,
          username: r.hostUsername,
          displayName: r.hostDisplayName,
          avatarUrl: this.storage.publicUrl(r.hostAvatarKey),
        },
        participantAvatarUrls: (r.participantAvatarKeys ?? []).map((key) =>
          this.storage.publicUrl(key),
        ),
        // Host counts as 1 going.
        goingCount: participantCount + 1,
        isOwn: r.authorUserId === viewerUserId,
      };
    });

    return { items, pageInfo: { nextCursor, hasMore } };
  }
}

/**
 * MALE → can see ALL + MALE-only.
 * FEMALE → can see ALL + FEMALE-only.
 * NON_BINARY / PREFER_NOT_TO_SAY → can only see ALL.
 */
function visibleGenderPreferencesFor(
  viewerGender: Gender,
): ActivityGenderPreference[] {
  switch (viewerGender) {
    case Gender.MALE:
      return [ActivityGenderPreference.ALL, ActivityGenderPreference.MALE];
    case Gender.FEMALE:
      return [ActivityGenderPreference.ALL, ActivityGenderPreference.FEMALE];
    default:
      return [ActivityGenderPreference.ALL];
  }
}
