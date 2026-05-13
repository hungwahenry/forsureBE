import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { BusinessVenueSuggestionRow } from './business-suggestions.serializer';

interface FindVenueSuggestionsArgs {
  lat: number;
  lng: number;
  q: string;
  limit: number;
}

export async function findVenueSuggestions(
  prisma: PrismaService,
  args: FindVenueSuggestionsArgs,
): Promise<BusinessVenueSuggestionRow[]> {
  const { lat, lng, q, limit } = args;
  const hasQuery = q.trim().length > 0;
  const normalizedQ = q.trim().toLowerCase();

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
              SELECT 1 FROM unnest(v."matchingKeywords") AS kw
              WHERE kw ILIKE '%' || ${normalizedQ} || '%'
                 OR ${normalizedQ} ILIKE '%' || kw || '%'
            )`
          : Prisma.empty
      }
    ORDER BY "distanceM" ASC
    LIMIT ${limit}
  `;
}
