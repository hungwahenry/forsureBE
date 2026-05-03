import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { NotificationEventCode } from '../../../common/constants/notification-events';

export const NOTIFICATIONS_QUEUE = 'notifications';

export interface NotificationJob {
  event: NotificationEventCode;
  recipientUserIds: string[];
  payload: Record<string, unknown>;
}

interface EnqueueOpts {
  dedupKey?: string;
  retainCompletedSeconds?: number;
}

@Injectable()
export class NotificationsQueue {
  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue<NotificationJob>,
  ) {}

  async enqueue(job: NotificationJob, opts: EnqueueOpts = {}): Promise<void> {
    if (job.recipientUserIds.length === 0) return;
    const completion = opts.retainCompletedSeconds
      ? { age: opts.retainCompletedSeconds }
      : { count: 1000 };
    await this.queue.add(job.event, job, {
      ...(opts.dedupKey ? { jobId: opts.dedupKey } : {}),
      removeOnComplete: completion,
      removeOnFail: { count: 5000 },
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }
}
