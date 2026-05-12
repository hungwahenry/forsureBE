import type { Report, ReportReason } from '@prisma/client';

export interface AdminUserReportItem {
  id: string;
  status: Report['status'];
  targetType: Report['targetType'];
  targetId: string;
  details: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reason: {
    id: string;
    code: string;
    label: string;
  };
}

type Row = Report & {
  reason: Pick<ReportReason, 'id' | 'code' | 'label'>;
};

export function serializeAdminUserReport(row: Row): AdminUserReportItem {
  return {
    id: row.id,
    status: row.status,
    targetType: row.targetType,
    targetId: row.targetId,
    details: row.details,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    reason: row.reason,
  };
}
