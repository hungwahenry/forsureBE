import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronRunLogger } from '../../../../common/cron/cron-run-logger.service';
import { PrismaService } from '../../../../prisma/prisma.service';

const JOB_NAME = 'VenueBudgetResetScheduler.resetDailyBudgets';

@Injectable()
export class VenueBudgetResetScheduler {
  private readonly logger = new Logger(VenueBudgetResetScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly runLogger: CronRunLogger,
  ) {}

  @Cron('0 0 * * *', { timeZone: 'UTC' })
  async resetDailyBudgets(): Promise<void> {
    await this.runLogger.wrap(JOB_NAME, async () => {
      const result = await this.prisma.$executeRaw`
        UPDATE "BusinessVenue"
        SET "dailyBudgetRemaining" = "dailyBudgetCents"
        WHERE "dailyBudgetRemaining" <> "dailyBudgetCents"
      `;
      this.logger.log(`Reset ${result} venue daily budgets`);
      return { reset: result };
    });
  }
}
