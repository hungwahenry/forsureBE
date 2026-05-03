import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { NotificationEventCode } from '../../../common/constants/notification-events';

export const NOTIFICATIONS_QUEUE = 'notifications';

/**
 * One job shape for every event. The processor dispatches by `event`.
 * `payload` is intentionally loose — the per-event handler types it.
 */
export interface NotificationJob {
  event: NotificationEventCode;
  /** Targets are user ids; sender is excluded by the producer, not the worker. */
  recipientUserIds: string[];
  payload: Record<string, unknown>;
}

@Injectable()
export class NotificationsQueue {
  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue<NotificationJob>,
  ) {}

  async enqueue(job: NotificationJob): Promise<void> {
    if (job.recipientUserIds.length === 0) return;
    await this.queue.add(job.event, job, {
      // De-dupe on (event + sorted recipients + payload) signature if needed later.
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }
}
