import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

export const RECEIPTS_QUEUE = 'notification-receipts';

export interface ReceiptEntry {
  receiptId: string;
  token: string;
}

export interface ReceiptJob {
  entries: ReceiptEntry[];
}

// A push ticket's `ok` status only means Expo accepted the message — dead
// tokens surface later in receipts. Expo asks callers to wait before fetching.
const CHECK_DELAY_MS = 20 * 60 * 1000;

@Injectable()
export class ReceiptsQueue {
  constructor(
    @InjectQueue(RECEIPTS_QUEUE)
    private readonly queue: Queue<ReceiptJob>,
  ) {}

  async enqueue(entries: ReceiptEntry[]): Promise<void> {
    if (entries.length === 0) return;
    await this.queue.add(
      'check-receipts',
      { entries },
      {
        delay: CHECK_DELAY_MS,
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 1000 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
      },
    );
  }
}
