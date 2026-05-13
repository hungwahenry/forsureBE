import type { Activity, ActivityBoost } from '@prisma/client';

export interface AdminBusinessBoostItem {
  id: string;
  activityId: string;
  activity: {
    emoji: string;
    title: string;
    startsAt: string;
  };
  radiusM: number;
  startsAt: string;
  endsAt: string;
  chargedCents: number;
  isOverage: boolean;
  cancelledAt: string | null;
  isActive: boolean;
  createdAt: string;
}

type BoostWithActivity = ActivityBoost & {
  activity: Pick<Activity, 'emoji' | 'title' | 'startsAt'>;
};

export function serializeAdminBusinessBoost(
  row: BoostWithActivity,
): AdminBusinessBoostItem {
  const now = Date.now();
  const isActive =
    row.cancelledAt === null &&
    row.startsAt.getTime() <= now &&
    row.endsAt.getTime() > now;
  return {
    id: row.id,
    activityId: row.activityId,
    activity: {
      emoji: row.activity.emoji,
      title: row.activity.title,
      startsAt: row.activity.startsAt.toISOString(),
    },
    radiusM: row.radiusM,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    chargedCents: row.chargedCents,
    isOverage: row.isOverage,
    cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,
    isActive,
    createdAt: row.createdAt.toISOString(),
  };
}
