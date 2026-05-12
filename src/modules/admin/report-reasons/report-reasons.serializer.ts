import type { ReportReason } from '@prisma/client';

export interface AdminReportReasonItem {
  id: string;
  code: string;
  label: string;
  description: string | null;
  applicableTo: ReportReason['applicableTo'];
  isGeneral: boolean;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  reportsCount: number;
}

export function serializeAdminReportReason(
  row: ReportReason,
  reportsCount: number,
): AdminReportReasonItem {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    description: row.description,
    applicableTo: row.applicableTo,
    isGeneral: row.isGeneral,
    active: row.active,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    reportsCount,
  };
}
