import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { BusinessVenueSuggestionRow } from './business-suggestions.serializer';

interface FindVenueSuggestionsArgs {
  lat: number;
  lng: number;
  q: string;
  limit: number;
}

function normalizeQuery(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((t) => t.length > 0)
    .join(' ');
}

export async function findVenueSuggestions(
  prisma: PrismaService,
  args: FindVenueSuggestionsArgs,
): Promise<BusinessVenueSuggestionRow[]> {
  const { lat, lng, q, limit } = args;
  const normalizedQ = normalizeQuery(q);
  const hasQuery = normalizedQ.length > 0;

  return prisma.$queryRaw<BusinessVenueSuggestionRow[]>`
    SELECT
      v.id            AS "venueId",
      v."placeName"   AS "placeName",
      v."placeLat"    AS "placeLat",
      v."placeLng"    AS "placeLng",
      ST_Distance(
        v."placePoint",
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      ) AS "distanceM",
      b.id            AS "businessId",
      b.name          AS "businessName",
      b."logoKey"     AS "businessLogoKey"
    FROM "BusinessVenue" v
    JOIN "Business" b ON b.id = v."businessId"
    WHERE b."verifiedAt" IS NOT NULL
      AND b."suspendedAt" IS NULL
      AND b."autoPausedAt" IS NULL
      AND v."isPaused" = false
      AND v."dailyBudgetRemaining" > 0
      AND ST_DWithin(
        v."placePoint",
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        v."maxRadiusM"
      )
      ${
        hasQuery
          ? Prisma.sql`AND EXISTS (
              SELECT 1
              FROM unnest(v."matchingKeywords") AS kw
              CROSS JOIN regexp_split_to_table(${normalizedQ}, '\s+') AS qt
              WHERE EXISTS (
                SELECT 1
                FROM regexp_split_to_table(kw, '[\s-]+') AS kwt
                WHERE kwt LIKE qt || '%' OR qt LIKE kwt || '%'
              )
            )`
          : Prisma.empty
      }
    ORDER BY "distanceM" ASC
    LIMIT ${limit}
  `;
}
