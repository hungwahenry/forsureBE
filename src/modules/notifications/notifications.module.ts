import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import { InboxModule } from '../inbox/inbox.module';
import { PreferencesModule } from '../preferences/preferences.module';
import { DevicesService } from './devices.service';
import { ExpoPushService } from './expo-push.service';
import { ActivityStart1hHandler } from './handlers/activity-start-1h.handler';
import { BroadcastHandler } from './handlers/broadcast.handler';
import { CancellationHandler } from './handlers/cancellation.handler';
import { ChatMessageHandler } from './handlers/chat-message.handler';
import { JoinHandler } from './handlers/join.handler';
import { LeaveHandler } from './handlers/leave.handler';
import { NewMemoryHandler } from './handlers/new-memory.handler';
import { PinnedHandler } from './handlers/pinned.handler';
import { NotificationsController } from './notifications.controller';
import { ActivityLifecycleNotifications } from './producers/activity-lifecycle.producer';
import { ActivityReminderNotifications } from './producers/activity-reminder.producer';
import { ChatNotifications } from './producers/chat.producer';
import { MemoryNotifications } from './producers/memory.producer';
import {
  NOTIFICATIONS_QUEUE,
  NotificationsQueue,
} from './queue/notifications.queue';
import { NotificationsProcessor } from './queue/notifications.processor';
import { RECEIPTS_QUEUE, ReceiptsQueue } from './queue/receipts.queue';
import { ReceiptsProcessor } from './queue/receipts.processor';

@Module({
  imports: [
    InboxModule,
    PreferencesModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: {
          url: config.get('REDIS_URL', { infer: true }),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: NOTIFICATIONS_QUEUE },
      { name: RECEIPTS_QUEUE },
    ),
  ],
  controllers: [NotificationsController],
  exports: [
    NotificationsQueue,
    ChatNotifications,
    ActivityLifecycleNotifications,
    ActivityReminderNotifications,
    MemoryNotifications,
  ],
  providers: [
    DevicesService,
    ExpoPushService,
    NotificationsQueue,
    NotificationsProcessor,
    ReceiptsQueue,
    ReceiptsProcessor,
    ChatMessageHandler,
    JoinHandler,
    LeaveHandler,
    CancellationHandler,
    PinnedHandler,
    NewMemoryHandler,
    ActivityStart1hHandler,
    BroadcastHandler,
    ChatNotifications,
    ActivityLifecycleNotifications,
    ActivityReminderNotifications,
    MemoryNotifications,
  ],
})
export class NotificationsModule {}
