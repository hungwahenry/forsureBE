import type { ActivityBoost } from '@prisma/client';

export interface ActivityBoostDto {
  id: string;
  activityId: string;
  businessId: string;
  radiusM: number;
  startsAt: string;
  endsAt: string;
  chargedCents: number;
  isOverage: boolean;
  cancelledAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export function serializeActivityBoost(row: ActivityBoost): ActivityBoostDto {
  const now = Date.now();
  const isActive =
    row.cancelledAt === null &&
    row.startsAt.getTime() <= now &&
    row.endsAt.getTime() > now;
  return {
    id: row.id,
    activityId: row.activityId,
    businessId: row.businessId,
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
