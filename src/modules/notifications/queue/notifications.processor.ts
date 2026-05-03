import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from '../../../email/email.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { InboxService } from '../../inbox/inbox.service';
import { PreferencesService } from '../../preferences/preferences.service';
import { DevicesService } from '../devices.service';
import { ExpoPushService } from '../expo-push.service';
import { ActivityStart1hHandler } from '../handlers/activity-start-1h.handler';
import { CancellationHandler } from '../handlers/cancellation.handler';
import { ChatMessageHandler } from '../handlers/chat-message.handler';
import { JoinHandler } from '../handlers/join.handler';
import { LeaveHandler } from '../handlers/leave.handler';
import { NewMemoryHandler } from '../handlers/new-memory.handler';
import { PinnedHandler } from '../handlers/pinned.handler';
import type {
  HandlerContext,
  NotificationHandler,
} from '../handlers/handler.types';
import {
  NOTIFICATIONS_QUEUE,
  type NotificationJob,
} from './notifications.queue';
import type { NotificationEventCode } from '../../../common/constants/notification-events';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);
  private readonly ctx: HandlerContext;
  private readonly handlers: Record<
    NotificationEventCode,
    NotificationHandler<never>
  >;

  constructor(
    prisma: PrismaService,
    expo: ExpoPushService,
    email: EmailService,
    preferences: PreferencesService,
    devices: DevicesService,
    inbox: InboxService,
    chatMessage: ChatMessageHandler,
    join: JoinHandler,
    leave: LeaveHandler,
    cancellation: CancellationHandler,
    pinned: PinnedHandler,
    newMemory: NewMemoryHandler,
    activityStart1h: ActivityStart1hHandler,
  ) {
    super();
    this.ctx = { prisma, expo, email, preferences, devices, inbox };
    this.handlers = {
      CHAT_MESSAGE: chatMessage,
      REPLY: chatMessage,
      JOIN: join,
      LEAVE: leave,
      CANCELLATION: cancellation,
      PINNED: pinned,
      NEW_MEMORY: newMemory,
      ACTIVITY_START_1H: activityStart1h,
    };
  }

  async process(job: Job<NotificationJob>): Promise<void> {
    const handler = this.handlers[job.data.event];
    if (!handler) {
      this.logger.warn({ event: job.data.event }, 'No handler for event');
      return;
    }
    try {
      await handler.handle(this.ctx, {
        recipientUserIds: job.data.recipientUserIds,
        payload: job.data.payload as never,
      });
    } catch (err) {
      this.logger.error(
        { err, jobId: job.id, event: job.data.event },
        'Notification handler failed',
      );
      throw err;
    }
  }
}
