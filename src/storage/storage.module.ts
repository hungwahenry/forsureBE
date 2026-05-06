import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { LocalStorageProvider } from './providers/local.provider';
import { S3StorageProvider } from './providers/s3.provider';
import { STORAGE_PROVIDER_TOKEN, StorageProvider } from './storage.interface';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER_TOKEN,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): StorageProvider =>
        config.get('STORAGE_DRIVER', { infer: true }) === 's3'
          ? new S3StorageProvider(config)
          : new LocalStorageProvider(config),
    },
  ],
  exports: [STORAGE_PROVIDER_TOKEN],
})
export class StorageModule {}
