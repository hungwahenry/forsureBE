import { Injectable, Logger } from '@nestjs/common';
import { DevicePlatform } from '@prisma/client';
import { createId } from '../../common/utils/id';
import { PrismaService } from '../../prisma/prisma.service';
import { ExpoPushService } from './expo-push.service';

interface RegisterArgs {
  userId: string;
  token: string;
  platform: DevicePlatform;
}

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly expo: ExpoPushService,
  ) {}

  /**
   * Upsert a device token. If the same token previously belonged to another
   * user (e.g. after a logout that didn't reach the server), reassign it.
   * Tokens that don't pass Expo's shape check are silently dropped — most
   * common cause is a non-prod simulator that returns a placeholder.
   */
  async register({ userId, token, platform }: RegisterArgs): Promise<void> {
    if (!this.expo.isValidToken(token)) {
      this.logger.warn({ token }, 'Ignoring non-Expo push token');
      return;
    }
    await this.prisma.notificationDevice.upsert({
      where: { token },
      create: {
        id: createId('ndv'),
        userId,
        token,
        platform,
      },
      update: {
        userId,
        platform,
        lastSeenAt: new Date(),
      },
    });
  }

  /**
   * Best-effort delete on logout. Scoped to the calling user so a stale token
   * registered to someone else can't be wiped.
   */
  async unregister(userId: string, token: string): Promise<void> {
    await this.prisma.notificationDevice.deleteMany({
      where: { userId, token },
    });
  }

  /** Called by the worker after Expo reports `DeviceNotRegistered`. */
  async deleteStaleTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    await this.prisma.notificationDevice.deleteMany({
      where: { token: { in: tokens } },
    });
  }
}
