import { ChatMessageKind, Prisma } from '@prisma/client';
import type { TimestampIdCursor } from '../../../common/utils/cursor';
import type { PrismaService } from '../../../prisma/prisma.service';

export const messageInclude = {
  sender: { include: { profile: true } },
  parent: { include: { sender: { include: { profile: true } } } },
} satisfies Prisma.ChatMessageInclude;

export type MessageWithRelations = Prisma.ChatMessageGetPayload<{
  include: typeof messageInclude;
}>;

interface CreateMessageInput {
  id: string;
  activityId: string;
  senderUserId: string;
  kind?: ChatMessageKind;
  body: string | null;
  imageKey: string | null;
  parentMessageId: string | null;
}

export async function findMessagesPage(
  prisma: PrismaService,
  activityId: string,
  cursor: TimestampIdCursor | null,
  limit: number,
  blockedSenderIds: string[],
): Promise<MessageWithRelations[]> {
  return prisma.chatMessage.findMany({
    where: {
      activityId,
      deletedAt: null,
      ...(blockedSenderIds.length > 0
        ? { senderUserId: { notIn: blockedSenderIds } }
        : {}),
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.ts) } },
              {
                AND: [
                  { createdAt: new Date(cursor.ts) },
                  { id: { lt: cursor.id } },
                ],
              },
            ],
          }
        : {}),
    },
    include: messageInclude,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
  });
}

/** Insert + return with relations in one round-trip. */
export async function createMessage(
  prisma: PrismaService,
  input: CreateMessageInput,
): Promise<MessageWithRelations> {
  return prisma.chatMessage.create({
    data: input,
    include: messageInclude,
  });
}

export async function findMessageBasics(
  prisma: PrismaService,
  messageId: string,
): Promise<{
  activityId: string;
  senderUserId: string;
  imageKey: string | null;
} | null> {
  return prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: { activityId: true, senderUserId: true, imageKey: true },
  });
}

export async function findReplyTargetActivityId(
  prisma: PrismaService,
  messageId: string,
): Promise<string | null> {
  const row = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: { activityId: true },
  });
  return row?.activityId ?? null;
}

export async function deleteMessage(
  prisma: PrismaService,
  messageId: string,
): Promise<void> {
  await prisma.chatMessage.delete({ where: { id: messageId } });
}

export async function setLastRead(
  prisma: PrismaService,
  args: { activityId: string; userId: string; at: Date },
): Promise<void> {
  await prisma.activityParticipant.update({
    where: {
      activityId_userId: {
        activityId: args.activityId,
        userId: args.userId,
      },
    },
    data: { lastReadAt: args.at },
  });
}
