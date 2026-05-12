import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { DATA_EXPORT_QUEUE } from '../../../account/export/queue/export.queue';
import { NOTIFICATIONS_QUEUE } from '../../../notifications/queue/notifications.queue';
import { AdminSharedModule } from '../../shared/admin-shared.module';
import { AdminQueuesController } from './queues.controller';
import { AdminQueuesService } from './queues.service';

@Module({
  imports: [
    AdminSharedModule,
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
    BullModule.registerQueue({ name: DATA_EXPORT_QUEUE }),
  ],
  controllers: [AdminQueuesController],
  providers: [AdminQueuesService],
})
export class AdminQueuesModule {}
