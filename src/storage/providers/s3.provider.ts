import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import { PutOptions, StorageProvider } from '../storage.interface';

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBase: string;

  constructor(config: ConfigService<Env, true>) {
    this.client = new S3Client({
      region: config.get('S3_REGION', { infer: true })!,
      endpoint: config.get('S3_ENDPOINT', { infer: true }),
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY_ID', { infer: true })!,
        secretAccessKey: config.get('S3_SECRET_ACCESS_KEY', { infer: true })!,
      },
      // path-style works with every S3-compatible provider; some (MinIO, B2)
      // require it. Cloudflare R2 supports both styles.
      forcePathStyle: true,
      // AWS SDK v3 started auto-adding CRC32 checksums on PutObject, which R2
      // and several other S3-compatible stores reject as AccessDenied.
      // Only send checksums when the API actually requires one.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
    this.bucket = config.get('S3_BUCKET', { infer: true })!;
    this.publicBase = config
      .get('S3_PUBLIC_URL', { infer: true })!
      .replace(/\/$/, '');
  }

  async put(key: string, body: Buffer, opts: PutOptions): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: opts.contentType,
        CacheControl: opts.cacheControl,
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  publicUrl(key: string): string {
    return `${this.publicBase}/${key}`;
  }
}
