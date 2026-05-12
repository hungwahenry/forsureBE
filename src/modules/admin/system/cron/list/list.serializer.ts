import type { CronRunLog } from '@prisma/client';

export interface AdminCronRunListItem {
  id: string;
  jobName: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  durationMs: number | null;
  errorMessage: string | null;
}

export function serializeAdminCronRunListItem(
  row: CronRunLog,
): AdminCronRunListItem {
  return {
    id: row.id,
    jobName: row.jobName,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
    status: row.status,
    durationMs: row.durationMs,
    errorMessage: row.errorMessage,
  };
}
