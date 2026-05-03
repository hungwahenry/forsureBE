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

 async unregister(userId: string, token: string): Promise<void> {
    await this.prisma.notificationDevice.deleteMany({
      where: { userId, token },
    });
  }

  async deleteStaleTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    await this.prisma.notificationDevice.deleteMany({
      where: { token: { in: tokens } },
    });
  }
}
