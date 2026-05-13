import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronRunLogger } from '../../../common/cron/cron-run-logger.service';
import { PrismaService } from '../../../prisma/prisma.service';

const JOB_NAME = 'BusinessAutoPauseScheduler.checkVenueFlags';
const DISTINCT_REPORTER_THRESHOLD = 3;
const WINDOW_DAYS = 30;

interface PausedRow {
  businessId: string;
  distinctReporters: number;
}

@Injectable()
export class BusinessAutoPauseScheduler {
  private readonly logger = new Logger(BusinessAutoPauseScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly runLogger: CronRunLogger,
  ) {}

  @Cron('0 * * * *', { timeZone: 'UTC' })
  async checkVenueFlags(): Promise<void> {
    await this.runLogger.wrap(JOB_NAME, async () => this.runOnce());
  }

  private async runOnce(): Promise<{ paused: number }> {
    const cutoff = new Date(Date.now() - WINDOW_DAYS * 86_400_000);

    const candidates = await this.prisma.$queryRaw<PausedRow[]>`
      SELECT
        v."businessId"                          AS "businessId",
        COUNT(DISTINCT r."reporterId")::int     AS "distinctReporters"
      FROM "Report" r
      JOIN "BusinessVenue" v ON v.id = r."targetId"
      JOIN "Business" b      ON b.id = v."businessId"
      WHERE r."targetType" = 'BUSINESS_VENUE'
        AND r."createdAt" >= ${cutoff}
        AND b."autoPausedAt" IS NULL
      GROUP BY v."businessId"
      HAVING COUNT(DISTINCT r."reporterId") >= ${DISTINCT_REPORTER_THRESHOLD}
    `;

    if (candidates.length === 0) {
      return { paused: 0 };
    }

    const now = new Date();
    const ids = candidates.map((c) => c.businessId);
    const result = await this.prisma.business.updateMany({
      where: { id: { in: ids }, autoPausedAt: null },
      data: { autoPausedAt: now },
    });

    this.logger.warn(
      { businessIds: ids, count: result.count },
      `Auto-paused ${result.count} business(es) hitting ${DISTINCT_REPORTER_THRESHOLD}+ distinct venue reports in last ${WINDOW_DAYS}d`,
    );
    return { paused: result.count };
  }
}
