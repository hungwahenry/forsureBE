import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Expo,
  type ExpoPushMessage,
  type ExpoPushTicket,
} from 'expo-server-sdk';
import type { Env } from '../../config/env.schema';

export interface SendResult {
  invalidTokens: string[];
}

@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);
  private readonly expo: Expo;

  constructor(config: ConfigService<Env, true>) {
    const accessToken = config.get('EXPO_ACCESS_TOKEN', { infer: true });
    this.expo = new Expo({ accessToken });
  }

  /** Validates a token's shape — cheap and synchronous. */
  isValidToken(token: string): boolean {
    return Expo.isExpoPushToken(token);
  }

  async send(messages: ExpoPushMessage[]): Promise<SendResult> {
    const valid = messages.filter((m) => {
      const to = Array.isArray(m.to) ? m.to : [m.to];
      return to.every((t) => Expo.isExpoPushToken(t));
    });
    if (valid.length === 0) return { invalidTokens: [] };

    const chunks = this.expo.chunkPushNotifications(valid);
    const tickets: ExpoPushTicket[] = [];
    for (const chunk of chunks) {
      try {
        const part = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...part);
      } catch (err: unknown) {
        this.logger.error({ err }, 'Expo push delivery failed for chunk');
      }
    }

    // Map tickets back to tokens to identify dead devices.
    const invalidTokens: string[] = [];
    let i = 0;
    for (const m of valid) {
      const to = Array.isArray(m.to) ? m.to : [m.to];
      for (const token of to) {
        const ticket = tickets[i++];
        if (
          ticket?.status === 'error' &&
          ticket.details?.error === 'DeviceNotRegistered'
        ) {
          invalidTokens.push(token);
        }
      }
    }

    return { invalidTokens };
  }
}
