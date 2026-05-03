import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import { DevicesService } from './devices.service';
import { ExpoPushService } from './expo-push.service';
import { NotificationsController } from './notifications.controller';
import { PreferencesService } from './preferences.service';
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
  ],
  exports: [NotificationsQueue],
})
export class NotificationsModule {}
