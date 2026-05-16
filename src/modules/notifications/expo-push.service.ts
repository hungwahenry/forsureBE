import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Expo,
  type ExpoPushMessage,
  type ExpoPushTicket,
} from 'expo-server-sdk';
import { FeatureFlagService } from '../../common/feature-flags/feature-flag.service';
import type { Env } from '../../config/env.schema';
import { ReceiptsQueue, type ReceiptEntry } from './queue/receipts.queue';

export interface SendResult {
  invalidTokens: string[];
}

@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);
  private readonly expo: Expo;

  constructor(
    config: ConfigService<Env, true>,
    private readonly featureFlags: FeatureFlagService,
    private readonly receipts: ReceiptsQueue,
  ) {
    const accessToken = config.get('EXPO_ACCESS_TOKEN', { infer: true });
    this.expo = new Expo({ accessToken });
  }

  isValidToken(token: string): boolean {
    return Expo.isExpoPushToken(token);
  }

  async send(messages: ExpoPushMessage[]): Promise<SendResult> {
    const enabled = await this.featureFlags.isEnabled(
      'push_notifications_enabled',
      true,
    );
    if (!enabled) return { invalidTokens: [] };

    const valid = messages.filter((m) => {
      const to = Array.isArray(m.to) ? m.to : [m.to];
      return to.every((t) => Expo.isExpoPushToken(t));
    });
    if (valid.length === 0) return { invalidTokens: [] };

    const chunks = this.expo.chunkPushNotifications(valid);
    const invalidTokens: string[] = [];
    const receiptEntries: ReceiptEntry[] = [];

    for (const chunk of chunks) {
      const chunkTokens = chunk.flatMap((m) =>
        Array.isArray(m.to) ? m.to : [m.to],
      );
      let tickets: ExpoPushTicket[];
      try {
        tickets = await this.expo.sendPushNotificationsAsync(chunk);
      } catch (err: unknown) {
        this.logger.error({ err }, 'Expo push delivery failed for chunk');
        continue;
      }
      tickets.forEach((ticket, idx) => {
        const token = chunkTokens[idx];
        if (!token) return;
        if (ticket.status === 'ok') {
          receiptEntries.push({ receiptId: ticket.id, token });
        } else if (ticket.details?.error === 'DeviceNotRegistered') {
          invalidTokens.push(token);
        }
      });
    }

    if (receiptEntries.length > 0) {
      await this.receipts.enqueue(receiptEntries);
    }

    return { invalidTokens };
  }

  async checkReceipts(entries: ReceiptEntry[]): Promise<string[]> {
    if (entries.length === 0) return [];

    const tokenByReceiptId = new Map(
      entries.map((e) => [e.receiptId, e.token]),
    );
    const chunks = this.expo.chunkPushNotificationReceiptIds(
      entries.map((e) => e.receiptId),
    );

    const invalidTokens: string[] = [];
    for (const chunk of chunks) {
      try {
        const receipts =
          await this.expo.getPushNotificationReceiptsAsync(chunk);
        for (const [receiptId, receipt] of Object.entries(receipts)) {
          if (
            receipt.status === 'error' &&
            receipt.details?.error === 'DeviceNotRegistered'
          ) {
            const token = tokenByReceiptId.get(receiptId);
            if (token) invalidTokens.push(token);
          }
        }
      } catch (err: unknown) {
        this.logger.error({ err }, 'Failed to fetch Expo push receipts');
      }
    }
    return invalidTokens;
  }
}
