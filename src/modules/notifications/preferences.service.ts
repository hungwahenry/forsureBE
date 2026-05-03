import { Injectable } from '@nestjs/common';
import {
  isNotificationEventCode,
  type NotificationEventCode,
  getEventDefault,
} from '../../common/constants/notification-events';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import type { PreferenceUpdateDto } from './dto/update-preferences.dto';
import {
  serializePreferences,
  type PreferencesDto,
} from './notifications.serializer';
import type { NotificationChannel } from '@prisma/client';

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<PreferencesDto> {
    const rows = await this.prisma.notificationPreference.findMany({
      where: { userId },
    });
    return serializePreferences(rows);
  }

  async update(
    userId: string,
    updates: PreferenceUpdateDto[],
  ): Promise<PreferencesDto> {
    for (const u of updates) {
      if (!isNotificationEventCode(u.eventCode)) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, {
          message: `Unknown notification event: ${u.eventCode}`,
        });
      }
    }

    await this.prisma.$transaction(
      updates.map((u) =>
        this.prisma.notificationPreference.upsert({
          where: {
            userId_eventCode_channel: {
              userId,
              eventCode: u.eventCode,
              channel: u.channel,
            },
          },
          create: {
            userId,
            eventCode: u.eventCode,
            channel: u.channel,
            enabled: u.enabled,
          },
          update: { enabled: u.enabled },
        }),
      ),
    );

    return this.list(userId);
  }

  async isEnabled(
    userId: string,
    event: NotificationEventCode,
    channel: NotificationChannel,
  ): Promise<boolean> {
    const row = await this.prisma.notificationPreference.findUnique({
      where: {
        userId_eventCode_channel: { userId, eventCode: event, channel },
      },
      select: { enabled: true },
    });
    return row?.enabled ?? getEventDefault(event, channel);
  }
}
