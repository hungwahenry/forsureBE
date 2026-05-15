import type { Job, Queue } from 'bullmq';
import type { JobState } from './dto/list-jobs.dto';

export interface QueueCounts {
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface AdminQueueSummary {
  name: string;
  counts: QueueCounts;
  isPaused: boolean;
}

export async function serializeQueueSummary(
  queue: Queue,
): Promise<AdminQueueSummary> {
  const [counts, isPaused] = await Promise.all([
    queue.getJobCounts(
      'active',
      'waiting',
      'completed',
      'failed',
      'delayed',
      'paused',
    ),
    queue.isPaused(),
  ]);
  return {
    name: queue.name,
    counts: {
      active: counts.active ?? 0,
      waiting: counts.waiting ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      paused: counts.paused ?? 0,
    },
    isPaused,
  };
}

export interface AdminQueueJobItem {
  id: string;
  name: string;
  state: JobState | 'unknown';
  data: unknown;
  attemptsMade: number;
  failedReason: string | null;
  stacktrace: string[] | null;
  createdAt: string | null;
  processedAt: string | null;
  finishedAt: string | null;
  delayUntil: string | null;
}

export async function serializeJob(
  job: Job,
  fallbackState: JobState,
): Promise<AdminQueueJobItem> {
  const state = (await job.getState().catch(() => fallbackState)) as
    | JobState
    | 'unknown';
  return {
    id: String(job.id ?? ''),
    name: job.name,
    state,
    data: job.data,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason ?? null,
    stacktrace:
      job.stacktrace && job.stacktrace.length > 0 ? job.stacktrace : null,
    createdAt: job.timestamp ? new Date(job.timestamp).toISOString() : null,
    processedAt: job.processedOn
      ? new Date(job.processedOn).toISOString()
      : null,
    finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    delayUntil:
      job.delay && job.timestamp
        ? new Date(job.timestamp + job.delay).toISOString()
        : null,
  };
}
