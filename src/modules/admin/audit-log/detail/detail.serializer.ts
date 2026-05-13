import type { AdminAuditLog, Prisma, User } from '@prisma/client';

export interface AdminAuditLogDetail {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  before: Prisma.JsonValue | null;
  after: Prisma.JsonValue | null;
  reason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  admin: { id: string; email: string };
}

type Row = AdminAuditLog & {
  admin: Pick<User, 'id' | 'email'>;
};

export function serializeAdminAuditLogDetail(row: Row): AdminAuditLogDetail {
  return {
    id: row.id,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    before: row.before,
    after: row.after,
    reason: row.reason,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
    admin: { id: row.admin.id, email: row.admin.email },
  };
}
