import type { PrismaService } from '../../../prisma/prisma.service';

export async function findActivityIdsForUser(
  prisma: PrismaService,
  userId: string,
): Promise<string[]> {
  const rows = await prisma.activityParticipant.findMany({
    where: { userId },
    select: { activityId: true },
  });
  return rows.map((r) => r.activityId);
}
