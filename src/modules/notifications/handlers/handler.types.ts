import type { EmailService } from '../../../email/email.service';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { DevicesService } from '../devices.service';
import type { ExpoPushService } from '../expo-push.service';
import type { PreferencesService } from '../preferences.service';

export interface HandlerContext {
  prisma: PrismaService;
  expo: ExpoPushService;
  email: EmailService;
  preferences: PreferencesService;
  devices: DevicesService;
}

export interface HandlerJob<T = Record<string, unknown>> {
  recipientUserIds: string[];
  payload: T;
}

export interface NotificationHandler<T = Record<string, unknown>> {
  handle(ctx: HandlerContext, job: HandlerJob<T>): Promise<void>;
}
