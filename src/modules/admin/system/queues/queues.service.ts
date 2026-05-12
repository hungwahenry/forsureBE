import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { Request } from 'express';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { AppException } from '../../../../common/exceptions/app.exception';
import { DATA_EXPORT_QUEUE } from '../../../account/export/queue/export.queue';
import { NOTIFICATIONS_QUEUE } from '../../../notifications/queue/notifications.queue';
import {
  AdminAuditAction,
  AdminAuditTargetType,
} from '../../shared/admin-audit.constants';
import { AdminAuditService } from '../../shared/admin-audit.service';
import { JobState, type ListQueueJobsDto } from './dto/list-jobs.dto';
import {
  serializeJob,
  serializeQueueSummary,
  type AdminQueueJobItem,
  type AdminQueueSummary,
} from './queues.serializer';

interface ActorContext {
  adminId: string;
  request: Request;
}

@Injectable()
export class AdminQueuesService {
  private readonly queues: Map<string, Queue>;

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE)
    private readonly notificationsQueue: Queue,
    @InjectQueue(DATA_EXPORT_QUEUE)
    private readonly exportsQueue: Queue,
    private readonly audit: AdminAuditService,
  ) {
    this.queues = new Map<string, Queue>([
      [NOTIFICATIONS_QUEUE, this.notificationsQueue],
      [DATA_EXPORT_QUEUE, this.exportsQueue],
    ]);
  }

  private requireQueue(name: string): Queue {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: `Queue "${name}" not found.`,
      });
    }
    return queue;
  }

  async listQueues(): Promise<AdminQueueSummary[]> {
    return Promise.all(
      [...this.queues.values()].map(serializeQueueSummary),
    );
  }

  async listJobs(
    name: string,
    query: ListQueueJobsDto,
  ): Promise<{ items: AdminQueueJobItem[] }> {
    const queue = this.requireQueue(name);
    const jobs = await queue.getJobs([query.state], 0, query.limit - 1, false);
    const items = await Promise.all(
      jobs.map((job) => serializeJob(job, query.state)),
    );
    return { items };
  }

  async retryJob(
    name: string,
    jobId: string,
    actor: ActorContext,
  ): Promise<void> {
    const queue = this.requireQueue(name);
    const job = await queue.getJob(jobId);
    if (!job) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Job not found.',
      });
    }
    const state = await job.getState();
    if (state !== JobState.FAILED) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: `Only failed jobs can be retried (current state: ${state}).`,
      });
    }
    await job.retry();
    await this.audit.record({
      adminId: actor.adminId,
      action: AdminAuditAction.QUEUE_JOB_RETRIED,
      targetType: AdminAuditTargetType.QUEUE_JOB,
      targetId: `${name}:${jobId}`,
      before: { state: JobState.FAILED, attemptsMade: job.attemptsMade },
      request: actor.request,
    });
  }
}
