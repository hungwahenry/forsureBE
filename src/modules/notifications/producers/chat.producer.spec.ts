import { NOTIFICATION_EVENT } from '../../../common/constants/notification-events';
import { ChatNotifications } from './chat.producer';

function makePrismaMock() {
  return {
    chatMessage: { findUnique: jest.fn() },
    activity: { findUnique: jest.fn() },
    profile: { findUnique: jest.fn() },
    activityParticipant: { findMany: jest.fn() },
  };
}

function makeQueueMock() {
  return { enqueue: jest.fn().mockResolvedValue(undefined) };
}

describe('ChatNotifications.chatMessage', () => {
  it('enqueues a CHAT_MESSAGE job with all participants except the sender', async () => {
    const prisma = makePrismaMock();
    const queue = makeQueueMock();
    const producer = new ChatNotifications(prisma as never, queue as never);

    prisma.chatMessage.findUnique.mockResolvedValue({
      activityId: 'act_1',
      senderUserId: 'usr_a',
      body: 'hey',
      imageKey: null,
      parentMessageId: null,
    });
    prisma.activity.findUnique.mockResolvedValue({
      title: 'pizza',
      emoji: '🍕',
    });
    prisma.profile.findUnique.mockResolvedValue({
      username: 'henry',
      displayName: 'Henry',
    });
    prisma.activityParticipant.findMany.mockResolvedValue([
      { userId: 'usr_b' },
      { userId: 'usr_c' },
    ]);

    await producer.chatMessage('msg_1');

    expect(queue.enqueue).toHaveBeenCalledTimes(1);
    const [job] = queue.enqueue.mock.calls[0];
    expect(job.event).toBe(NOTIFICATION_EVENT.CHAT_MESSAGE);
    expect(job.recipientUserIds).toEqual(['usr_b', 'usr_c']);
    expect(job.payload).toMatchObject({
      activityId: 'act_1',
      senderUsername: 'henry',
      body: 'hey',
      hasImage: false,
    });
    expect(job.payload.parentAuthorUserId).toBeUndefined();
  });

  it('flags the parent author when the message is a reply to someone else', async () => {
    const prisma = makePrismaMock();
    const queue = makeQueueMock();
    const producer = new ChatNotifications(prisma as never, queue as never);

    prisma.chatMessage.findUnique
      .mockResolvedValueOnce({
        activityId: 'act_1',
        senderUserId: 'usr_a',
        body: 'agreed',
        imageKey: null,
        parentMessageId: 'msg_parent',
      })
      .mockResolvedValueOnce({ senderUserId: 'usr_b' }); // parent lookup
    prisma.activity.findUnique.mockResolvedValue({
      title: 'pizza',
      emoji: '🍕',
    });
    prisma.profile.findUnique.mockResolvedValue({
      username: 'henry',
      displayName: 'Henry',
    });
    prisma.activityParticipant.findMany.mockResolvedValue([
      { userId: 'usr_b' },
      { userId: 'usr_c' },
    ]);

    await producer.chatMessage('msg_1');

    const [job] = queue.enqueue.mock.calls[0];
    expect(job.payload.parentAuthorUserId).toBe('usr_b');
  });

  it('omits the parent flag when replying to your own message', async () => {
    const prisma = makePrismaMock();
    const queue = makeQueueMock();
    const producer = new ChatNotifications(prisma as never, queue as never);

    prisma.chatMessage.findUnique
      .mockResolvedValueOnce({
        activityId: 'act_1',
        senderUserId: 'usr_a',
        body: 'note to self',
        imageKey: null,
        parentMessageId: 'msg_parent',
      })
      .mockResolvedValueOnce({ senderUserId: 'usr_a' });
    prisma.activity.findUnique.mockResolvedValue({
      title: 'pizza',
      emoji: '🍕',
    });
    prisma.profile.findUnique.mockResolvedValue({
      username: 'henry',
      displayName: 'Henry',
    });
    prisma.activityParticipant.findMany.mockResolvedValue([
      { userId: 'usr_b' },
    ]);

    await producer.chatMessage('msg_1');

    const [job] = queue.enqueue.mock.calls[0];
    expect(job.payload.parentAuthorUserId).toBeUndefined();
  });

  it('does not enqueue when the message has no other participants', async () => {
    const prisma = makePrismaMock();
    const queue = makeQueueMock();
    const producer = new ChatNotifications(prisma as never, queue as never);

    prisma.chatMessage.findUnique.mockResolvedValue({
      activityId: 'act_1',
      senderUserId: 'usr_a',
      body: 'lonely',
      imageKey: null,
      parentMessageId: null,
    });
    prisma.activity.findUnique.mockResolvedValue({
      title: 'pizza',
      emoji: '🍕',
    });
    prisma.profile.findUnique.mockResolvedValue({
      username: 'henry',
      displayName: 'Henry',
    });
    prisma.activityParticipant.findMany.mockResolvedValue([]);

    await producer.chatMessage('msg_1');

    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('swallows DB errors so notifications never break the originating action', async () => {
    const prisma = makePrismaMock();
    const queue = makeQueueMock();
    const producer = new ChatNotifications(prisma as never, queue as never);

    prisma.chatMessage.findUnique.mockRejectedValue(new Error('db down'));

    await expect(producer.chatMessage('msg_1')).resolves.toBeUndefined();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});
