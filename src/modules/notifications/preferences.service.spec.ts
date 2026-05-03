import { NotificationChannel } from '@prisma/client';
import { NOTIFICATION_EVENT } from '../../common/constants/notification-events';
import { PreferencesService } from './preferences.service';

interface PrismaMock {
  notificationPreference: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    upsert: jest.Mock;
  };
  $transaction: jest.Mock;
}

function makePrismaMock(): PrismaMock {
  const upsert = jest.fn();
  return {
    notificationPreference: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert,
    },
    $transaction: jest.fn().mockImplementation((ops) => Promise.all(ops)),
  };
}

describe('PreferencesService', () => {
  describe('list', () => {
    it('returns defaults when the user has no rows', async () => {
      const prisma = makePrismaMock();
      const svc = new PreferencesService(prisma as never);

      const result = await svc.list('usr_x');

      const chat = result.entries.find(
        (e) => e.eventCode === 'CHAT_MESSAGE' && e.channel === 'PUSH',
      );
      const start1hEmail = result.entries.find(
        (e) => e.eventCode === 'ACTIVITY_START_1H' && e.channel === 'EMAIL',
      );
      // CHAT_MESSAGE push default is true; ACTIVITY_START_1H email default is true.
      expect(chat?.enabled).toBe(true);
      expect(start1hEmail?.enabled).toBe(true);
      // Every event has 2 channel entries.
      expect(result.entries).toHaveLength(8 * 2);
    });

    it('overlays user overrides on top of defaults', async () => {
      const prisma = makePrismaMock();
      prisma.notificationPreference.findMany.mockResolvedValue([
        {
          eventCode: 'CHAT_MESSAGE',
          channel: 'PUSH',
          enabled: false,
        },
      ]);
      const svc = new PreferencesService(prisma as never);

      const result = await svc.list('usr_x');

      const chat = result.entries.find(
        (e) => e.eventCode === 'CHAT_MESSAGE' && e.channel === 'PUSH',
      );
      const join = result.entries.find(
        (e) => e.eventCode === 'JOIN' && e.channel === 'PUSH',
      );
      expect(chat?.enabled).toBe(false); // override
      expect(join?.enabled).toBe(true); // default
    });
  });

  describe('update', () => {
    it('rejects unknown event codes', async () => {
      const prisma = makePrismaMock();
      const svc = new PreferencesService(prisma as never);

      await expect(
        svc.update('usr_x', [
          {
            eventCode: 'NOT_A_REAL_EVENT',
            channel: NotificationChannel.PUSH,
            enabled: false,
          },
        ]),
      ).rejects.toThrow(/Unknown notification event/);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('upserts rows for valid event codes', async () => {
      const prisma = makePrismaMock();
      const svc = new PreferencesService(prisma as never);

      await svc.update('usr_x', [
        {
          eventCode: NOTIFICATION_EVENT.CHAT_MESSAGE,
          channel: NotificationChannel.PUSH,
          enabled: false,
        },
      ]);

      expect(prisma.notificationPreference.upsert).toHaveBeenCalledTimes(1);
      const call = prisma.notificationPreference.upsert.mock.calls[0][0];
      expect(call.where.userId_eventCode_channel).toEqual({
        userId: 'usr_x',
        eventCode: 'CHAT_MESSAGE',
        channel: 'PUSH',
      });
      expect(call.update.enabled).toBe(false);
      expect(call.create.enabled).toBe(false);
    });
  });

  describe('isEnabled', () => {
    it('returns the stored row value when present', async () => {
      const prisma = makePrismaMock();
      prisma.notificationPreference.findUnique.mockResolvedValue({
        enabled: false,
      });
      const svc = new PreferencesService(prisma as never);

      const result = await svc.isEnabled(
        'usr_x',
        NOTIFICATION_EVENT.CHAT_MESSAGE,
        NotificationChannel.PUSH,
      );
      expect(result).toBe(false);
    });

    it('falls back to the code-level default when no row exists', async () => {
      const prisma = makePrismaMock();
      prisma.notificationPreference.findUnique.mockResolvedValue(null);
      const svc = new PreferencesService(prisma as never);

      // CHAT_MESSAGE EMAIL defaults to false; PUSH defaults to true.
      const emailEnabled = await svc.isEnabled(
        'usr_x',
        NOTIFICATION_EVENT.CHAT_MESSAGE,
        NotificationChannel.EMAIL,
      );
      const pushEnabled = await svc.isEnabled(
        'usr_x',
        NOTIFICATION_EVENT.CHAT_MESSAGE,
        NotificationChannel.PUSH,
      );
      expect(emailEnabled).toBe(false);
      expect(pushEnabled).toBe(true);
    });
  });
});
