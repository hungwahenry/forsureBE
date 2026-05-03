import { NotificationChannel } from '@prisma/client';
import { NOTIFICATION_EVENT } from '../../../common/constants/notification-events';
import {
  filterEnabled,
  sendEmailToUsers,
  sendPushToUsers,
} from './handler.helpers';
import type { HandlerContext } from './handler.types';

function makeCtx(overrides: Partial<HandlerContext> = {}): HandlerContext {
  return {
    prisma: {
      notificationDevice: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    } as never,
    expo: { send: jest.fn().mockResolvedValue({ invalidTokens: [] }) } as never,
    email: { send: jest.fn() } as never,
    preferences: { isEnabled: jest.fn().mockResolvedValue(true) } as never,
    devices: { deleteStaleTokens: jest.fn() } as never,
    ...overrides,
  };
}

describe('handler.helpers', () => {
  describe('filterEnabled', () => {
    it('keeps only users whose preference for the channel is on', async () => {
      const ctx = makeCtx({
        preferences: {
          isEnabled: jest
            .fn()
            .mockImplementation((id: string) =>
              Promise.resolve(id !== 'usr_off'),
            ),
        } as never,
      });

      const result = await filterEnabled(
        ctx,
        ['usr_a', 'usr_off', 'usr_b'],
        NOTIFICATION_EVENT.CHAT_MESSAGE,
        NotificationChannel.PUSH,
      );

      expect(result).toEqual(['usr_a', 'usr_b']);
    });
  });

  describe('sendPushToUsers', () => {
    it('builds messages from each token a user has and sends one batch', async () => {
      const findMany = jest.fn().mockResolvedValue([
        { userId: 'usr_a', token: 'tok_a1' },
        { userId: 'usr_a', token: 'tok_a2' },
        { userId: 'usr_b', token: 'tok_b' },
      ]);
      const expoSend = jest.fn().mockResolvedValue({ invalidTokens: [] });
      const ctx = makeCtx({
        prisma: { notificationDevice: { findMany } } as never,
        expo: { send: expoSend } as never,
      });

      await sendPushToUsers(
        ctx,
        NOTIFICATION_EVENT.CHAT_MESSAGE,
        ['usr_a', 'usr_b'],
        { title: 'hi', body: 'hello', data: { type: 'chat' } },
      );

      expect(expoSend).toHaveBeenCalledTimes(1);
      const messages = expoSend.mock.calls[0][0];
      expect(messages).toHaveLength(3);
      expect(messages.map((m: { to: string }) => m.to)).toEqual([
        'tok_a1',
        'tok_a2',
        'tok_b',
      ]);
      expect(messages[0].title).toBe('hi');
      expect(messages[0].body).toBe('hello');
      expect(messages[0].sound).toBe('default');
    });

    it('reaps invalid tokens reported by Expo (DeviceNotRegistered)', async () => {
      const findMany = jest
        .fn()
        .mockResolvedValue([{ userId: 'usr_a', token: 'tok_dead' }]);
      const expoSend = jest
        .fn()
        .mockResolvedValue({ invalidTokens: ['tok_dead'] });
      const deleteStaleTokens = jest.fn();
      const ctx = makeCtx({
        prisma: { notificationDevice: { findMany } } as never,
        expo: { send: expoSend } as never,
        devices: { deleteStaleTokens } as never,
      });

      await sendPushToUsers(
        ctx,
        NOTIFICATION_EVENT.CHAT_MESSAGE,
        ['usr_a'],
        { title: 't', body: 'b' },
      );

      expect(deleteStaleTokens).toHaveBeenCalledWith(['tok_dead']);
    });

    it('skips users who have no devices', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const expoSend = jest.fn().mockResolvedValue({ invalidTokens: [] });
      const ctx = makeCtx({
        prisma: { notificationDevice: { findMany } } as never,
        expo: { send: expoSend } as never,
      });

      await sendPushToUsers(ctx, NOTIFICATION_EVENT.CHAT_MESSAGE, ['usr_a'], {
        title: 't',
        body: 'b',
      });

      expect(expoSend).not.toHaveBeenCalled();
    });

    it('does not send when preference filtering eliminates everyone', async () => {
      const expoSend = jest.fn();
      const ctx = makeCtx({
        preferences: { isEnabled: jest.fn().mockResolvedValue(false) } as never,
        expo: { send: expoSend } as never,
      });

      await sendPushToUsers(ctx, NOTIFICATION_EVENT.CHAT_MESSAGE, ['usr_a'], {
        title: 't',
        body: 'b',
      });

      expect(expoSend).not.toHaveBeenCalled();
    });
  });

  describe('sendEmailToUsers', () => {
    it('emails each enabled recipient via the configured template', async () => {
      const userFindMany = jest.fn().mockResolvedValue([
        { id: 'usr_a', email: 'a@example.com' },
        { id: 'usr_b', email: 'b@example.com' },
      ]);
      const emailSend = jest.fn().mockResolvedValue(undefined);
      const ctx = makeCtx({
        prisma: { user: { findMany: userFindMany } } as never,
        email: { send: emailSend } as never,
      });

      await sendEmailToUsers(
        ctx,
        NOTIFICATION_EVENT.ACTIVITY_START_1H,
        ['usr_a', 'usr_b'],
        { template: 'activity-starts-soon', data: { foo: 'bar' } },
      );

      expect(emailSend).toHaveBeenCalledTimes(2);
      const recipients = emailSend.mock.calls.map((c) => c[0].to);
      expect(recipients).toEqual(
        expect.arrayContaining(['a@example.com', 'b@example.com']),
      );
      expect(emailSend.mock.calls[0][0].template).toBe('activity-starts-soon');
    });

    it('swallows per-recipient failures so one bad email does not abort the batch', async () => {
      const userFindMany = jest.fn().mockResolvedValue([
        { id: 'usr_a', email: 'a@example.com' },
        { id: 'usr_b', email: 'b@example.com' },
      ]);
      const emailSend = jest
        .fn()
        .mockRejectedValueOnce(new Error('resend down'))
        .mockResolvedValueOnce(undefined);
      const ctx = makeCtx({
        prisma: { user: { findMany: userFindMany } } as never,
        email: { send: emailSend } as never,
      });

      await expect(
        sendEmailToUsers(
          ctx,
          NOTIFICATION_EVENT.ACTIVITY_START_1H,
          ['usr_a', 'usr_b'],
          { template: 'activity-starts-soon', data: {} },
        ),
      ).resolves.toBeUndefined();

      expect(emailSend).toHaveBeenCalledTimes(2);
    });
  });
});
