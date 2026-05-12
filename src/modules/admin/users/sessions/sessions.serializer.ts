import type { RefreshToken } from '@prisma/client';

export interface AdminUserSessionItem {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  isActive: boolean;
}

export function serializeAdminUserSession(
  row: RefreshToken,
  now: Date,
): AdminUserSessionItem {
  return {
    id: row.id,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
    expiresAt: row.expiresAt.toISOString(),
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
    isActive: row.revokedAt === null && row.expiresAt > now,
  };
}
