import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { LocalStorageProvider } from './providers/local.provider';
import { S3StorageProvider } from './providers/s3.provider';
import { STORAGE_PROVIDER_TOKEN, StorageProvider } from './storage.interface';

@Global()
@Module({
  providers: [
    LocalStorageProvider,
    S3StorageProvider,
    {
      provide: STORAGE_PROVIDER_TOKEN,
      inject: [ConfigService, LocalStorageProvider, S3StorageProvider],
      useFactory: (
        config: ConfigService<Env, true>,
        local: LocalStorageProvider,
        s3: S3StorageProvider,
      ): StorageProvider =>
        config.get('STORAGE_DRIVER', { infer: true }) === 's3' ? s3 : local,
    },
  ],
  exports: [STORAGE_PROVIDER_TOKEN],
})
export class StorageModule {}
