import { InboxService } from './inbox.service';

function makePrisma() {
  return {
    notification: {
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

describe('InboxService', () => {
  describe('write', () => {
    it('persists one row per recipient with the provided content', async () => {
      const prisma = makePrisma();
      const svc = new InboxService(prisma as never);

      await svc.write([
        {
          userId: 'usr_a',
          eventCode: 'CHAT_MESSAGE',
          title: 't',
          body: 'b',
          data: { type: 'chat' },
        },
        {
          userId: 'usr_b',
          eventCode: 'CHAT_MESSAGE',
          title: 't',
          body: 'b',
          data: { type: 'chat' },
        },
      ]);

      expect(prisma.notification.createMany).toHaveBeenCalledTimes(1);
      const data = prisma.notification.createMany.mock.calls[0][0].data;
      expect(data).toHaveLength(2);
      expect(data.every((d: { eventCode: string }) => d.eventCode === 'CHAT_MESSAGE')).toBe(true);
    });

    it('no-ops on an empty input', async () => {
      const prisma = makePrisma();
      const svc = new InboxService(prisma as never);

      await svc.write([]);

      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('returns the resolved page with a nextCursor when more results exist', async () => {
      const prisma = makePrisma();
      // Return limit + 1 rows to signal hasMore.
      prisma.notification.findMany.mockResolvedValue(
        Array.from({ length: 21 }, (_, i) => ({
          id: `ntn_${i}`,
          eventCode: 'CHAT_MESSAGE',
          title: 't',
          body: 'b',
          data: {},
          readAt: null,
          createdAt: new Date(2026, 0, 21 - i),
        })),
      );
      const svc = new InboxService(prisma as never);

      const result = await svc.list('usr_a', { limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.pageInfo.hasMore).toBe(true);
      expect(result.pageInfo.nextCursor).not.toBeNull();
    });

    it('returns no nextCursor on the last page', async () => {
      const prisma = makePrisma();
      prisma.notification.findMany.mockResolvedValue([
        {
          id: 'ntn_1',
          eventCode: 'CHAT_MESSAGE',
          title: 't',
          body: 'b',
          data: {},
          readAt: null,
          createdAt: new Date(),
        },
      ]);
      const svc = new InboxService(prisma as never);

      const result = await svc.list('usr_a', { limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.pageInfo.hasMore).toBe(false);
      expect(result.pageInfo.nextCursor).toBeNull();
    });
  });

  describe('unreadCount', () => {
    it('counts only rows where readAt is null', async () => {
      const prisma = makePrisma();
      prisma.notification.count.mockResolvedValue(5);
      const svc = new InboxService(prisma as never);

      const n = await svc.unreadCount('usr_a');

      expect(n).toBe(5);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'usr_a', readAt: null },
      });
    });
  });

  describe('markRead', () => {
    it('marks all unread when no ids are passed', async () => {
      const prisma = makePrisma();
      const svc = new InboxService(prisma as never);

      await svc.markRead('usr_a', {});

      const call = prisma.notification.updateMany.mock.calls[0][0];
      expect(call.where).toEqual({ userId: 'usr_a', readAt: null });
      expect(call.data.readAt).toBeInstanceOf(Date);
    });

    it('scopes the update to the given ids when provided', async () => {
      const prisma = makePrisma();
      const svc = new InboxService(prisma as never);

      await svc.markRead('usr_a', { ids: ['ntn_1', 'ntn_2'] });

      const call = prisma.notification.updateMany.mock.calls[0][0];
      expect(call.where).toEqual({
        userId: 'usr_a',
        id: { in: ['ntn_1', 'ntn_2'] },
        readAt: null,
      });
    });
  });
});
