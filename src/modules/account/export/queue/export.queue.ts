import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

export const DATA_EXPORT_QUEUE = 'data-exports';

export interface DataExportJob {
  requestId: string;
  userId: string;
}

@Injectable()
export class DataExportQueue {
  constructor(
    @InjectQueue(DATA_EXPORT_QUEUE)
    private readonly queue: Queue<DataExportJob>,
  ) {}

  async enqueue(job: DataExportJob): Promise<void> {
    await this.queue.add('build-and-deliver', job, {
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
      attempts: 2,
      backoff: { type: 'exponential', delay: 10_000 },
    });
  }
}
