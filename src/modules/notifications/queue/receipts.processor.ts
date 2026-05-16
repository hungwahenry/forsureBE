import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DevicesService } from '../devices.service';
import { ExpoPushService } from '../expo-push.service';
import { RECEIPTS_QUEUE, type ReceiptJob } from './receipts.queue';

@Processor(RECEIPTS_QUEUE)
export class ReceiptsProcessor extends WorkerHost {
  private readonly logger = new Logger(ReceiptsProcessor.name);

  constructor(
    private readonly expo: ExpoPushService,
    private readonly devices: DevicesService,
  ) {
    super();
  }

  async process(job: Job<ReceiptJob>): Promise<void> {
    const invalidTokens = await this.expo.checkReceipts(job.data.entries);
    if (invalidTokens.length > 0) {
      this.logger.log(
        { count: invalidTokens.length },
        'Reaping stale push tokens from receipts',
      );
      await this.devices.deleteStaleTokens(invalidTokens);
    }
  }
}
