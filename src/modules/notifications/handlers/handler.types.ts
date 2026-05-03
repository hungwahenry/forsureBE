import type { EmailService } from '../../../email/email.service';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { InboxService } from '../../inbox/inbox.service';
import type { PreferencesService } from '../../preferences/preferences.service';
import type { DevicesService } from '../devices.service';
import type { ExpoPushService } from '../expo-push.service';

export interface HandlerContext {
  prisma: PrismaService;
  expo: ExpoPushService;
  email: EmailService;
  preferences: PreferencesService;
  devices: DevicesService;
  inbox: InboxService;
}

export interface HandlerJob<T = Record<string, unknown>> {
  recipientUserIds: string[];
  payload: T;
}

export interface NotificationHandler<T = Record<string, unknown>> {
  handle(ctx: HandlerContext, job: HandlerJob<T>): Promise<void>;
}
