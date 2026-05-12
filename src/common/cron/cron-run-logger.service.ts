import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createId } from '../utils/id';
import { PrismaService } from '../../prisma/prisma.service';

type FinishStatus = 'SUCCESS' | 'FAILED';

@Injectable()
export class CronRunLogger {
  private readonly logger = new Logger(CronRunLogger.name);

  constructor(private readonly prisma: PrismaService) {}

  async wrap<T>(jobName: string, fn: () => Promise<T>): Promise<T> {
    const logId = await this.startLog(jobName);
    const startMs = Date.now();
    try {
      const result = await fn();
      await this.finishLog(logId, 'SUCCESS', Date.now() - startMs, result, null);
      return result;
    } catch (err) {
      await this.finishLog(logId, 'FAILED', Date.now() - startMs, null, err);
      throw err;
    }
  }

  private async startLog(jobName: string): Promise<string | null> {
    try {
      const row = await this.prisma.cronRunLog.create({
        data: { id: createId('crl'), jobName, status: 'RUNNING' },
        select: { id: true },
      });
      return row.id;
    } catch (err) {
      this.logger.warn(`Failed to open cron run log for ${jobName}: ${err}`);
      return null;
    }
  }

  private async finishLog(
    logId: string | null,
    status: FinishStatus,
    durationMs: number,
    result: unknown,
    error: unknown,
  ): Promise<void> {
    if (!logId) return;
    const errorMessage =
      error instanceof Error
        ? error.message
        : error
          ? String(error)
          : null;
    const errorStack = error instanceof Error ? (error.stack ?? null) : null;
    const resultJson =
      result === null || result === undefined
        ? null
        : (result as Prisma.InputJsonValue);
    try {
      await this.prisma.cronRunLog.update({
        where: { id: logId },
        data: {
          finishedAt: new Date(),
          status,
          durationMs,
          result: resultJson ?? Prisma.JsonNull,
          errorMessage,
          errorStack,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to close cron run log ${logId}: ${err}`);
    }
  }
}
