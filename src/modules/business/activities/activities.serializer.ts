import type { Activity, ActivityBoost, ActivityStatus } from '@prisma/client';
import {
  serializeActivityBoost,
  type ActivityBoostDto,
} from '../boosts/boosts.serializer';

export interface BusinessActivityDto {
  id: string;
  emoji: string;
  title: string;
  startsAt: string;
  placeName: string;
  status: ActivityStatus;
  capacity: number;
  participantCount: number;
  postCount: number;
  activeBoost: ActivityBoostDto | null;
}

export function serializeBusinessActivity(
  row: Activity & { boosts: ActivityBoost[] },
): BusinessActivityDto {
  const now = Date.now();
  const active =
    row.boosts.find(
      (b) =>
        b.cancelledAt === null &&
        b.startsAt.getTime() <= now &&
        b.endsAt.getTime() > now,
    ) ?? null;
  return {
    id: row.id,
    emoji: row.emoji,
    title: row.title,
    startsAt: row.startsAt.toISOString(),
    placeName: row.placeName,
    status: row.status,
    capacity: row.capacity,
    participantCount: row.participantCount,
    postCount: row.postCount,
    activeBoost: active ? serializeActivityBoost(active) : null,
  };
}
