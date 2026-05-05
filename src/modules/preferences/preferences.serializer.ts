import type {
  NotificationChannel,
  NotificationPreference,
} from '@prisma/client';
import {
  NOTIFICATION_EVENT_CODES,
  NOTIFICATION_EVENT_DEFAULTS,
  type NotificationEventCode,
} from '../../common/constants/notification-events';

export interface PreferenceEntryDto {
  eventCode: NotificationEventCode;
  channel: NotificationChannel;
  enabled: boolean;
}

export interface PreferencesDto {
  entries: PreferenceEntryDto[];
}

export function serializePreferences(
  rows: NotificationPreference[],
): PreferencesDto {
  const overrides = new Map<string, boolean>();
  for (const r of rows) {
    overrides.set(`${r.eventCode}:${r.channel}`, r.enabled);
  }
  const entries: PreferenceEntryDto[] = [];
  for (const eventCode of NOTIFICATION_EVENT_CODES) {
    const defaults = NOTIFICATION_EVENT_DEFAULTS[eventCode];
    for (const channel of ['PUSH', 'EMAIL'] as const) {
      const key = `${eventCode}:${channel}`;
      const enabled = overrides.has(key)
        ? overrides.get(key)!
        : channel === 'PUSH'
          ? defaults.push
          : defaults.email;
      entries.push({ eventCode, channel, enabled });
    }
  }
  return { entries };
}
