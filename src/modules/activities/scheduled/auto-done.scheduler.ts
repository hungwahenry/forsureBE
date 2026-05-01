import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ActivityRole, ActivityStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeService } from '../../../realtime/realtime.service';
import { ChatEvents, chatRoom } from '../../chats/chats.events';
import { MessagesService } from '../../chats/messages/messages.service';

const DONE_AFTER_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AutoDoneScheduler {
  private readonly logger = new Logger(AutoDoneScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly messages: MessagesService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async maturedToDone(): Promise<void> {
    const cutoff = new Date(Date.now() - DONE_AFTER_MS);
    const matured = await this.prisma.activity.findMany({
      where: { status: ActivityStatus.OPEN, startsAt: { lt: cutoff } },
      select: {
        id: true,
        participants: {
          where: { role: ActivityRole.HOST },
          select: { userId: true },
          take: 1,
        },
      },
    });
    if (matured.length === 0) return;

    await this.prisma.activity.updateMany({
      where: {
        id: { in: matured.map((a) => a.id) },
        status: ActivityStatus.OPEN,
      },
      data: { status: ActivityStatus.DONE },
    });

    for (const a of matured) {
      const hostUserId = a.participants[0]?.userId;
      if (hostUserId) {
        await this.messages
          .postSystemMessage(a.id, hostUserId, 'this activity has ended')
          .catch((err: unknown) => {
            this.logger.warn(
              { err, activityId: a.id },
              'system message failed',
            );
          });
      }
      this.realtime.toRoom(chatRoom(a.id), ChatEvents.ActivityUpdated, {
        activityId: a.id,
      });
    }
    this.logger.log(`Auto-DONE flipped ${matured.length} activities`);
  }
}
