import { DevicePlatform } from '@prisma/client';
import { DevicesService } from './devices.service';

function makePrismaMock() {
  return {
    notificationDevice: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

function makeExpoMock(opts: { isValid?: boolean } = {}) {
  return {
    isValidToken: jest.fn().mockReturnValue(opts.isValid ?? true),
  };
}

describe('DevicesService', () => {
  describe('register', () => {
    it('skips tokens that fail Expo shape validation (e.g. simulator junk)', async () => {
      const prisma = makePrismaMock();
      const expo = makeExpoMock({ isValid: false });
      const svc = new DevicesService(prisma as never, expo as never);

      await svc.register({
        userId: 'usr_x',
        token: 'bogus',
        platform: DevicePlatform.IOS,
      });

      expect(prisma.notificationDevice.upsert).not.toHaveBeenCalled();
    });

    it('upserts on token (so re-signin reassigns userId without conflict)', async () => {
      const prisma = makePrismaMock();
      const expo = makeExpoMock();
      const svc = new DevicesService(prisma as never, expo as never);

      await svc.register({
        userId: 'usr_b',
        token: 'ExponentPushToken[xxx]',
        platform: DevicePlatform.IOS,
      });

      expect(prisma.notificationDevice.upsert).toHaveBeenCalledTimes(1);
      const call = prisma.notificationDevice.upsert.mock.calls[0][0];
      expect(call.where).toEqual({ token: 'ExponentPushToken[xxx]' });
      expect(call.create.userId).toBe('usr_b');
      expect(call.update.userId).toBe('usr_b');
    });
  });

  describe('unregister', () => {
    it('scopes the delete by userId so a stale token registered to someone else stays', async () => {
      const prisma = makePrismaMock();
      const expo = makeExpoMock();
      const svc = new DevicesService(prisma as never, expo as never);

      await svc.unregister('usr_x', 'ExponentPushToken[xxx]');

      expect(prisma.notificationDevice.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'usr_x', token: 'ExponentPushToken[xxx]' },
      });
    });
  });

  describe('deleteStaleTokens', () => {
    it('no-ops on empty input', async () => {
      const prisma = makePrismaMock();
      const expo = makeExpoMock();
      const svc = new DevicesService(prisma as never, expo as never);

      await svc.deleteStaleTokens([]);

      expect(prisma.notificationDevice.deleteMany).not.toHaveBeenCalled();
    });

    it('deletes by token across users (worker has no userId context)', async () => {
      const prisma = makePrismaMock();
      const expo = makeExpoMock();
      const svc = new DevicesService(prisma as never, expo as never);

      await svc.deleteStaleTokens(['t1', 't2']);

      expect(prisma.notificationDevice.deleteMany).toHaveBeenCalledWith({
        where: { token: { in: ['t1', 't2'] } },
      });
    });
  });
});
