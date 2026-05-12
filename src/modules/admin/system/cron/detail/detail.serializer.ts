import type { CronRunLog, Prisma } from '@prisma/client';

export interface AdminCronRunDetail {
  id: string;
  jobName: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  durationMs: number | null;
  errorMessage: string | null;
  errorStack: string | null;
  result: Prisma.JsonValue | null;
}

export function serializeAdminCronRunDetail(
  row: CronRunLog,
): AdminCronRunDetail {
  return {
    id: row.id,
    jobName: row.jobName,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
    status: row.status,
    durationMs: row.durationMs,
    errorMessage: row.errorMessage,
    errorStack: row.errorStack,
    result: row.result,
  };
}
