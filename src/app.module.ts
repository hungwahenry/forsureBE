import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Redis } from 'ioredis';
import { SentryModule } from '@sentry/nestjs/setup';
import type { Request } from 'express';
import { LoggerModule } from 'nestjs-pino';
import { v7 as uuidv7 } from 'uuid';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { ConfigModule } from './config/config.module';
import type { Env } from './config/env.schema';
import { EmailModule } from './email/email.module';
import { HealthModule } from './health/health.module';
import { AccountModule } from './modules/account/account.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { BlocksModule } from './modules/blocks/blocks.module';
import { BusinessModule } from './modules/business/business.module';
import { PublicBusinessCategoriesModule } from './modules/business-categories/business-categories.module';
import { ChatsModule } from './modules/chats/chats.module';
import { EggsModule } from './modules/eggs/eggs.module';
import { ExploreModule } from './modules/explore/explore.module';
import { FeatureFlagsRoutesModule } from './modules/feature-flags/feature-flags.module';
import { FeedModule } from './modules/feed/feed.module';
import { InboxModule } from './modules/inbox/inbox.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { PlacesModule } from './modules/places/places.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { ReportsModule } from './modules/reports/reports.module';
import { StepUpModule } from './modules/step-up/step-up.module';
import { UsersModule } from './modules/users/users.module';
import { CronModule } from './common/cron/cron.module';
import { FeatureFlagsModule } from './common/feature-flags/feature-flags.module';
import { SentryContextInterceptor } from './common/interceptors/sentry-context.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule,

    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          genReqId: (req) =>
            (req.headers['x-request-id'] as string | undefined) ??
            `req_${uuidv7().replace(/-/g, '')}`,
          customProps: (req) => ({
            requestId: (req as unknown as Request).requestId,
          }),
          transport:
            config.get('NODE_ENV', { infer: true }) === 'production'
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: { singleLine: true, translateTime: 'SYS:standard' },
                },
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
            ],
            censor: '[REDACTED]',
          },
        },
      }),
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
        storage: new ThrottlerStorageRedisService(
          new Redis(config.get('REDIS_URL', { infer: true }), {
            maxRetriesPerRequest: 1,
          }),
        ),
      }),
    }),

    ScheduleModule.forRoot(),
    PrismaModule,
    CronModule,
    FeatureFlagsModule,
    EmailModule,
    StorageModule,
    HealthModule,
    AuthModule,
    RealtimeModule,
    OnboardingModule,
    ActivitiesModule,
    FeedModule,
    PlacesModule,
    ChatsModule,
    ReportsModule,
    ExploreModule,
    UsersModule,
    InboxModule,
    PreferencesModule,
    NotificationsModule,
    BlocksModule,
    BusinessModule,
    PublicBusinessCategoriesModule,
    StepUpModule,
    AccountModule,
    EggsModule,
    FeatureFlagsRoutesModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: SentryContextInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes({ path: '{*splat}', method: RequestMethod.ALL });
  }
}
