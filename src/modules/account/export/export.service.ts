import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../common/app-config/app-config.service';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { createId } from '../../../common/utils/id';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../storage/storage.interface';
import { DataExportQueue } from './queue/export.queue';

export interface RequestExportResult {
  requestId: string;
  status: 'PENDING' | 'COMPLETED';
}

export interface ResolvedDownload {
  body: Buffer;
  contentType: string;
  filename: string;
}

@Injectable()
export class DataExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: DataExportQueue,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
    private readonly appConfig: AppConfigService,
  ) {}

  async request(userId: string): Promise<RequestExportResult> {
    const cooldownHours = await this.appConfig.getInt(
      'account.export_request_cooldown_hours',
    );
    const cutoff = new Date(Date.now() - cooldownHours * 60 * 60_000);
    const recent = await this.prisma.dataExportRequest.findFirst({
      where: {
        userId,
        createdAt: { gte: cutoff },
        status: { in: ['PENDING', 'COMPLETED'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'You already have a recent export. Try again in 24 hours.',
      });
    }

    const request = await this.prisma.dataExportRequest.create({
      data: { id: createId('exp'), userId },
    });
    await this.queue.enqueue({ requestId: request.id, userId });
    return { requestId: request.id, status: 'PENDING' };
  }

  async download(token: string): Promise<ResolvedDownload> {
    const request = await this.prisma.dataExportRequest.findUnique({
      where: { downloadToken: token },
    });
    if (
      !request ||
      request.status !== 'COMPLETED' ||
      !request.storageKey ||
      !request.expiresAt
    ) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Download not found.',
      });
    }
    if (request.consumedAt) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'This download link has already been used.',
      });
    }
    if (request.expiresAt.getTime() < Date.now()) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'This download link has expired.',
      });
    }

    const fetched = await this.storage.get(request.storageKey);

    // Mark consumed BEFORE returning so a concurrent retry can't double-spend.
    await this.prisma.dataExportRequest.update({
      where: { id: request.id },
      data: { consumedAt: new Date() },
    });
    // Best-effort cleanup of the blob.
    void this.storage.delete(request.storageKey).catch(() => undefined);

    return {
      body: fetched.body,
      contentType: fetched.contentType,
      filename: `forsure-export-${request.id}.json`,
    };
  }
}
