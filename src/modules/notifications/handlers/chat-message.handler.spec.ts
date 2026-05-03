import { ChatMessageHandler } from './chat-message.handler';
import type { HandlerContext } from './handler.types';

interface TokenRow {
  userId: string;
  token: string;
}

function makeCtx(tokens: TokenRow[] = []): HandlerContext {
  const findMany = jest.fn().mockImplementation((args: { where?: { userId?: { in?: string[] } } }) => {
    const ids = args?.where?.userId?.in ?? [];
    return Promise.resolve(
      tokens.filter((t) => ids.includes(t.userId)).map((t) => ({ token: t.token })),
    );
  });
  return {
    prisma: {
      notificationDevice: { findMany },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    } as never,
    expo: {
      send: jest.fn().mockResolvedValue({ invalidTokens: [] }),
    } as never,
    email: { send: jest.fn() } as never,
    preferences: { isEnabled: jest.fn().mockResolvedValue(true) } as never,
    devices: { deleteStaleTokens: jest.fn() } as never,
    inbox: { write: jest.fn().mockResolvedValue(undefined) } as never,
  };
}

describe('ChatMessageHandler', () => {
  const handler = new ChatMessageHandler();

  it('sends a chat-style push to participants and includes the activity title in the heading', async () => {
    const ctx = makeCtx([{ userId: 'usr_b', token: 'tok_b' }]);

    await handler.handle(ctx, {
      recipientUserIds: ['usr_b'],
      payload: {
        activityId: 'act_1',
        activityTitle: 'pizza',
        activityEmoji: '🍕',
        senderUsername: 'henry',
        senderDisplayName: 'Henry',
        body: 'hey crew',
        hasImage: false,
      },
    });

    expect((ctx.expo.send as jest.Mock).mock.calls[0][0]).toEqual([
      expect.objectContaining({
        to: 'tok_b',
        title: '🍕 pizza',
        body: '@henry: hey crew',
        threadId: 'chat:act_1',
        data: { type: 'chat', activityId: 'act_1' },
      }),
    ]);
  });

  it('falls back to a photo placeholder body when the message has no text', async () => {
    const ctx = makeCtx([{ userId: 'usr_b', token: 'tok_b' }]);

    await handler.handle(ctx, {
      recipientUserIds: ['usr_b'],
      payload: {
        activityId: 'act_1',
        activityTitle: 'pizza',
        activityEmoji: '🍕',
        senderUsername: 'henry',
        senderDisplayName: 'Henry',
        body: null,
        hasImage: true,
      },
    });

    const messages = (ctx.expo.send as jest.Mock).mock.calls[0][0];
    expect(messages[0].body).toContain('photo');
  });

  it('routes the parent author through the REPLY event and excludes them from the regular CHAT_MESSAGE batch', async () => {
    const ctx = makeCtx([
      { userId: 'usr_b', token: 'tok_b' },
      { userId: 'usr_c', token: 'tok_c' },
    ]);

    await handler.handle(ctx, {
      recipientUserIds: ['usr_b', 'usr_c'],
      payload: {
        activityId: 'act_1',
        activityTitle: 'pizza',
        activityEmoji: '🍕',
        senderUsername: 'henry',
        senderDisplayName: 'Henry',
        body: 'agreed',
        hasImage: false,
        parentAuthorUserId: 'usr_b',
      },
    });

    // Expected: 2 send calls — one for the REPLY (usr_b), one for CHAT_MESSAGE (usr_c only).
    expect(ctx.expo.send).toHaveBeenCalledTimes(2);

    const replyCall = (ctx.expo.send as jest.Mock).mock.calls[0][0];
    const chatCall = (ctx.expo.send as jest.Mock).mock.calls[1][0];

    expect(replyCall[0].title).toMatch(/replied/);
    expect(chatCall.map((m: { to: string }) => m.to)).toEqual(['tok_c']);
  });

  it('no-ops when there are no recipients', async () => {
    const ctx = makeCtx();

    await handler.handle(ctx, {
      recipientUserIds: [],
      payload: {
        activityId: 'act_1',
        activityTitle: 'pizza',
        activityEmoji: '🍕',
        senderUsername: 'henry',
        senderDisplayName: 'Henry',
        body: 'hello',
        hasImage: false,
      },
    });

    expect(ctx.expo.send).not.toHaveBeenCalled();
  });
});
