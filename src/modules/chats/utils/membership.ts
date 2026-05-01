import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { PrismaService } from '../../../prisma/prisma.service';

export type ChatRole = 'host' | 'participant';

export interface ChatMembership {
  activityId: string;
  role: ChatRole;
}

/**
 * Resolve the viewer's chat role for an activity.
 *
 * Chat membership = host OR has an ActivityParticipant row. Throws
 * RESOURCE_NOT_FOUND for unknown activities and AUTH_FORBIDDEN for non-members
 * (NOT_FOUND would leak existence to outsiders).
 */
export async function requireChatMembership(
  prisma: PrismaService,
  userId: string,
  activityId: string,
): Promise<ChatMembership> {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { id: true, authorUserId: true },
  });
  if (!activity) {
    throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
  }
  if (activity.authorUserId === userId) {
    return { activityId, role: 'host' };
  }
  const participant = await prisma.activityParticipant.findUnique({
    where: { activityId_userId: { activityId, userId } },
    select: { id: true },
  });
  if (!participant) {
    throw new AppException(ErrorCode.AUTH_FORBIDDEN, {
      message: "You're not in this chat.",
    });
  }
  return { activityId, role: 'participant' };
}
