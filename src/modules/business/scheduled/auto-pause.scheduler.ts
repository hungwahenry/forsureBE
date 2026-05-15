import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AppConfigService } from '../../../common/app-config/app-config.service';
import { CronRunLogger } from '../../../common/cron/cron-run-logger.service';
import { FeatureFlagService } from '../../../common/feature-flags/feature-flag.service';
import { PrismaService } from '../../../prisma/prisma.service';

const JOB_NAME = 'BusinessAutoPauseScheduler.checkVenueFlags';

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
    private readonly featureFlags: FeatureFlagService,
    private readonly appConfig: AppConfigService,
  ) {}

  @Cron('0 * * * *', { timeZone: 'UTC' })
  async checkVenueFlags(): Promise<void> {
    await this.runLogger.wrap(JOB_NAME, async () => this.runOnce());
  }

  private async runOnce(): Promise<{ paused: number; skipped?: boolean }> {
    const enabled = await this.featureFlags.isEnabled(
      'business_auto_pause_enabled',
      true,
    );
    if (!enabled) return { paused: 0, skipped: true };

    const [windowDays, reporterThreshold] = await Promise.all([
      this.appConfig.getInt('venue.auto_pause_window_days'),
      this.appConfig.getInt('venue.auto_pause_reporter_threshold'),
    ]);
    const cutoff = new Date(Date.now() - windowDays * 86_400_000);

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
      HAVING COUNT(DISTINCT r."reporterId") >= ${reporterThreshold}
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
      `Auto-paused ${result.count} business(es) hitting ${reporterThreshold}+ distinct venue reports in last ${windowDays}d`,
    );
    return { paused: result.count };
  }
}
