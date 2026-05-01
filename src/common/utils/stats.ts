import type { Prisma } from '@prisma/client';
import { createId } from './id';

type TxClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Upsert a UserYearStats row and atomically increment one or more fields.
 * Pass a plain object of field→increment amount (positive integers).
 *
 * Example:
 *   await upsertYearStats(tx, userId, { messagesSentCount: 1 });
 */
export async function upsertYearStats(
  tx: TxClient,
  userId: string,
  increments: Partial<{
    activitiesHostedCount: number;
    activitiesJoinedCount: number;
    activitiesCompletedCount: number;
    activitiesCancelledCount: number;
    messagesSentCount: number;
    memoriesPostedCount: number;
    photosSharedCount: number;
  }>,
): Promise<void> {
  const year = new Date().getFullYear();

  await tx.userYearStats.upsert({
    where: { userId_year: { userId, year } },
    create: {
      id: createId('uys'),
      userId,
      year,
      activitiesHostedCount: increments.activitiesHostedCount ?? 0,
      activitiesJoinedCount: increments.activitiesJoinedCount ?? 0,
      activitiesCompletedCount: increments.activitiesCompletedCount ?? 0,
      activitiesCancelledCount: increments.activitiesCancelledCount ?? 0,
      messagesSentCount: increments.messagesSentCount ?? 0,
      memoriesPostedCount: increments.memoriesPostedCount ?? 0,
      photosSharedCount: increments.photosSharedCount ?? 0,
    },
    update: {
      ...(increments.activitiesHostedCount && {
        activitiesHostedCount: { increment: increments.activitiesHostedCount },
      }),
      ...(increments.activitiesJoinedCount && {
        activitiesJoinedCount: { increment: increments.activitiesJoinedCount },
      }),
      ...(increments.activitiesCompletedCount && {
        activitiesCompletedCount: {
          increment: increments.activitiesCompletedCount,
        },
      }),
      ...(increments.activitiesCancelledCount && {
        activitiesCancelledCount: {
          increment: increments.activitiesCancelledCount,
        },
      }),
      ...(increments.messagesSentCount && {
        messagesSentCount: { increment: increments.messagesSentCount },
      }),
      ...(increments.memoriesPostedCount && {
        memoriesPostedCount: { increment: increments.memoriesPostedCount },
      }),
      ...(increments.photosSharedCount && {
        photosSharedCount: { increment: increments.photosSharedCount },
      }),
    },
  });
}
