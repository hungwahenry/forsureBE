import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { randomBytes } from 'crypto';
import type { Env } from '../../../../config/env.schema';
import { EmailService } from '../../../../email/email.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../../storage/storage.interface';
import { ExportBuilder } from '../export.builder';
import { DATA_EXPORT_QUEUE, type DataExportJob } from './export.queue';

const DOWNLOAD_TTL_HOURS = 24;

@Processor(DATA_EXPORT_QUEUE)
@Injectable()
export class DataExportProcessor extends WorkerHost {
  private readonly logger = new Logger(DataExportProcessor.name);
  private readonly downloadBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly builder: ExportBuilder,
    private readonly email: EmailService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
    config: ConfigService<Env, true>,
  ) {
    super();
    this.downloadBaseUrl = config
      .get('APP_PUBLIC_URL', { infer: true })
      .replace(/\/$/, '');
  }

  async process(job: Job<DataExportJob>): Promise<void> {
    const { requestId, userId } = job.data;
    try {
      const buffer = await this.builder.build(userId);
      const downloadToken = randomBytes(32).toString('hex');
      const storageKey = `exports/${downloadToken}.json`;

      await this.storage.put(storageKey, buffer, {
        contentType: 'application/json',
        cacheControl: 'no-store',
      });

      const expiresAt = new Date(Date.now() + DOWNLOAD_TTL_HOURS * 60 * 60_000);
      await this.prisma.dataExportRequest.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          storageKey,
          downloadToken,
          expiresAt,
          completedAt: new Date(),
        },
      });

      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { email: true },
      });
      const downloadUrl = `${this.downloadBaseUrl}/v1/account/export/download/${downloadToken}`;

      await this.email.send({
        to: user.email,
        template: 'data-export-ready',
        data: {
          downloadUrl,
          ttlHours: DOWNLOAD_TTL_HOURS,
        },
      });
    } catch (err: unknown) {
      this.logger.error(
        { err, jobId: job.id, requestId },
        'Data export job failed',
      );
      await this.prisma.dataExportRequest.update({
        where: { id: requestId },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          errorMessage: err instanceof Error ? err.message : 'unknown error',
        },
      });
      throw err;
    }
  }
}
