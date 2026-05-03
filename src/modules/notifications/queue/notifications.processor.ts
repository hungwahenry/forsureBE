import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DevicesService } from '../devices.service';
import {
  NOTIFICATIONS_QUEUE,
  type NotificationJob,
} from './notifications.queue';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly devices: DevicesService) {
    super();
  }

  async process(job: Job<NotificationJob>): Promise<void> {
    this.logger.log(
      { jobId: job.id, event: job.data.event, recipients: job.data.recipientUserIds.length },
      'Notification job received (no handler wired yet)',
    );
    void this.devices;
  }
}
