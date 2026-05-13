import { Injectable } from '@nestjs/common';
import type { ActivityStatus } from '@prisma/client';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { AppException } from '../../../../common/exceptions/app.exception';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../../storage/storage.interface';
import { Inject } from '@nestjs/common';

const WINDOW_DAYS = 30;
const ACTIVITY_LIMIT = 20;

export interface VenueAnalyticsStats {
  picks: number;
  conversions: number;
  billableConversions: number;
  spendCents: number;
  activities: number;
}

export interface VenueAnalyticsActivity {
  id: string;
  emoji: string;
  title: string;
  startsAt: string;
  status: ActivityStatus;
  capacity: number;
  participantCount: number;
  postCount: number;
  hostUsername: string | null;
  hostDisplayName: string | null;
  hostAvatarUrl: string | null;
  chargedCents: number;
}

export interface VenueAnalyticsDto {
  windowDays: number;
  stats: VenueAnalyticsStats;
  activities: VenueAnalyticsActivity[];
}

interface StatsRow {
  picks: bigint;
  conversions: bigint;
  billable_conversions: bigint;
  spend_cents: bigint;
  activities: bigint;
}

interface ActivityRow {
  id: string;
  emoji: string;
  title: string;
  startsAt: Date;
  status: ActivityStatus;
  capacity: number;
  participantCount: number;
  postCount: number;
  hostUsername: string | null;
  hostDisplayName: string | null;
  hostAvatarKey: string | null;
  chargedCents: number | null;
}

@Injectable()
export class VenueAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async get(businessId: string, venueId: string): Promise<VenueAnalyticsDto> {
    const owns = await this.prisma.businessVenue.findUnique({
      where: { id: venueId },
      select: { businessId: true },
    });
    if (!owns || owns.businessId !== businessId) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Venue not found.',
      });
    }

    const cutoff = new Date(Date.now() - WINDOW_DAYS * 86_400_000);

    const statsRows = await this.prisma.$queryRaw<StatsRow[]>`
      SELECT
        COUNT(*) FILTER (WHERE kind = 'PICK')      AS picks,
        COUNT(*) FILTER (WHERE kind = 'CONFIRMED') AS conversions,
        COUNT(*) FILTER (
          WHERE kind = 'CONFIRMED' AND "chargedCents" > 0
        )                                          AS billable_conversions,
        COALESCE(
          SUM("chargedCents") FILTER (WHERE kind = 'CONFIRMED'),
          0
        )                                          AS spend_cents,
        COUNT(DISTINCT "activityId") FILTER (
          WHERE kind = 'CONFIRMED'
        )                                          AS activities
      FROM "VenueSuggestionEvent"
      WHERE "venueId" = ${venueId}
        AND "createdAt" >= ${cutoff}
    `;
    const stats = statsRows[0];

    const activities = await this.prisma.$queryRaw<ActivityRow[]>`
      SELECT
        a.id,
        a.emoji,
        a.title,
        a."startsAt",
        a.status,
        a.capacity,
        a."participantCount",
        a."postCount",
        prof.username    AS "hostUsername",
        prof."displayName" AS "hostDisplayName",
        prof."avatarKey"   AS "hostAvatarKey",
        vse."chargedCents"
      FROM "Activity" a
      LEFT JOIN "ActivityParticipant" host
        ON host."activityId" = a.id AND host.role = 'HOST'
      LEFT JOIN "Profile" prof ON prof."userId" = host."userId"
      LEFT JOIN "VenueSuggestionEvent" vse
        ON vse."activityId" = a.id AND vse.kind = 'CONFIRMED'
      WHERE a."businessVenueId" = ${venueId}
        AND a."deletedAt" IS NULL
        AND a."createdAt" >= ${cutoff}
      ORDER BY a."createdAt" DESC
      LIMIT ${ACTIVITY_LIMIT}
    `;

    return {
      windowDays: WINDOW_DAYS,
      stats: {
        picks: Number(stats.picks),
        conversions: Number(stats.conversions),
        billableConversions: Number(stats.billable_conversions),
        spendCents: Number(stats.spend_cents),
        activities: Number(stats.activities),
      },
      activities: activities.map((row) => ({
        id: row.id,
        emoji: row.emoji,
        title: row.title,
        startsAt: row.startsAt.toISOString(),
        status: row.status,
        capacity: row.capacity,
        participantCount: row.participantCount,
        postCount: row.postCount,
        hostUsername: row.hostUsername,
        hostDisplayName: row.hostDisplayName,
        hostAvatarUrl: row.hostAvatarKey
          ? this.storage.publicUrl(row.hostAvatarKey)
          : null,
        chargedCents: row.chargedCents ?? 0,
      })),
    };
  }
}
