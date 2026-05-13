import type { AdminAuditLog, User } from '@prisma/client';

export interface AdminAuditLogListItem {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  reason: string | null;
  createdAt: string;
  admin: { id: string; email: string };
}

type Row = AdminAuditLog & {
  admin: Pick<User, 'id' | 'email'>;
};

export function serializeAdminAuditLogListItem(
  row: Row,
): AdminAuditLogListItem {
  return {
    id: row.id,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
    admin: { id: row.admin.id, email: row.admin.email },
  };
}
