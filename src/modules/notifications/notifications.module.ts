import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import { DevicesService } from './devices.service';
import { ExpoPushService } from './expo-push.service';
import { ActivityStart1hHandler } from './handlers/activity-start-1h.handler';
import { CancellationHandler } from './handlers/cancellation.handler';
import { ChatMessageHandler } from './handlers/chat-message.handler';
import { JoinHandler } from './handlers/join.handler';
import { LeaveHandler } from './handlers/leave.handler';
import { NewMemoryHandler } from './handlers/new-memory.handler';
import { PinnedHandler } from './handlers/pinned.handler';
import { NotificationsController } from './notifications.controller';
import { PreferencesService } from './preferences.service';
import { ActivityLifecycleNotifications } from './producers/activity-lifecycle.producer';
import { ActivityReminderNotifications } from './producers/activity-reminder.producer';
import { ChatNotifications } from './producers/chat.producer';
import { MemoryNotifications } from './producers/memory.producer';
import {
  NOTIFICATIONS_QUEUE,
  NotificationsQueue,
} from './queue/notifications.queue';
import { NotificationsProcessor } from './queue/notifications.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: {
          url: config.get('REDIS_URL', { infer: true }),
        },
      }),
    }),
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
  ],
  controllers: [NotificationsController],
  providers: [
    DevicesService,
    PreferencesService,
    ExpoPushService,
    NotificationsQueue,
    NotificationsProcessor,
    ChatMessageHandler,
    JoinHandler,
    LeaveHandler,
    CancellationHandler,
    PinnedHandler,
    NewMemoryHandler,
    ActivityStart1hHandler,
    ChatNotifications,
    ActivityLifecycleNotifications,
    ActivityReminderNotifications,
    MemoryNotifications,
  ],
  exports: [
    ChatNotifications,
    ActivityLifecycleNotifications,
    ActivityReminderNotifications,
    MemoryNotifications,
  ],
})
export class NotificationsModule {}
