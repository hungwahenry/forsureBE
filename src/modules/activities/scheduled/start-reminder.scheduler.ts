import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ActivityStatus } from '@prisma/client';
import { CronRunLogger } from '../../../common/cron/cron-run-logger.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ActivityReminderNotifications } from '../../notifications/producers/activity-reminder.producer';

const ONE_HOUR_MS = 60 * 60 * 1000;
const WINDOW_MS = 10 * 60 * 1000;

const JOB_NAME = 'ActivityStartReminderScheduler.dispatchOneHourReminders';

@Injectable()
export class ActivityStartReminderScheduler {
  private readonly logger = new Logger(ActivityStartReminderScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: ActivityReminderNotifications,
    private readonly runLogger: CronRunLogger,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async dispatchOneHourReminders(): Promise<void> {
    await this.runLogger.wrap(JOB_NAME, async () => {
      const now = Date.now();
      const lower = new Date(now + ONE_HOUR_MS - WINDOW_MS);
      const upper = new Date(now + ONE_HOUR_MS);
      const due = await this.prisma.activity.findMany({
        where: {
          status: { in: [ActivityStatus.OPEN, ActivityStatus.FULL] },
          startsAt: { gte: lower, lt: upper },
        },
        select: { id: true },
      });
      if (due.length === 0) return { dispatched: 0 };

      for (const a of due) {
        await this.notifications.activityStart1h(a.id);
      }
      this.logger.log(`Enqueued 1h reminders for ${due.length} activities`);
      return { dispatched: due.length };
    });
  }
}
