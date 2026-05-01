import type { Report, ReportReason } from '@prisma/client';

export interface ReportReasonDto {
  id: string;
  code: string;
  label: string;
  description: string | null;
}

export interface ReportDto {
  id: string;
  targetType: Report['targetType'];
  targetId: string;
  status: Report['status'];
  reasonId: string;
  details: string | null;
  createdAt: string;
}

export function serializeReason(r: ReportReason): ReportReasonDto {
  return {
    id: r.id,
    code: r.code,
    label: r.label,
    description: r.description,
  };
}

export function serializeReport(r: Report): ReportDto {
  return {
    id: r.id,
    targetType: r.targetType,
    targetId: r.targetId,
    status: r.status,
    reasonId: r.reasonId,
    details: r.details,
    createdAt: r.createdAt.toISOString(),
  };
}
