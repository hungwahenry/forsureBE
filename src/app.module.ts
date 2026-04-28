import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { v7 as uuidv7 } from 'uuid';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { ConfigModule } from './config/config.module';
import type { Env } from './config/env.schema';
import { EmailModule } from './email/email.module';
import { HealthModule } from './health/health.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { AuthModule } from './modules/auth/auth.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule,

    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          genReqId: (req) =>
            (req.headers['x-request-id'] as string | undefined) ??
            `req_${uuidv7().replace(/-/g, '')}`,
          customProps: (req) => ({ requestId: (req as any).requestId }),
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

    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
    }),

    PrismaModule,
    EmailModule,
    StorageModule,
    HealthModule,
    AuthModule,
    OnboardingModule,
    ActivitiesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes({ path: '{*splat}', method: RequestMethod.ALL });
  }
}
