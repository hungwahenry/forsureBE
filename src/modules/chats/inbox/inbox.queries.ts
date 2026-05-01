import type { PrismaService } from '../../../prisma/prisma.service';
import type { ChatPreviewRow } from '../chats.interface';

interface RawPreviewRow {
  activity_id: string;
  title: string;
  emoji: string;
  starts_at: Date;
  host_user_id: string;
  unread_count: number;
  last_id: string | null;
  last_body: string | null;
  last_image_key: string | null;
  last_created_at: Date | null;
  last_sender_username: string | null;
}

export async function findChatPreviews(
  prisma: PrismaService,
  userId: string,
): Promise<ChatPreviewRow[]> {
  const rows = await prisma.$queryRaw<RawPreviewRow[]>`
    SELECT
      a.id                       AS activity_id,
      a.title,
      a.emoji,
      a."startsAt"               AS starts_at,
      host."userId"              AS host_user_id,
      COALESCE(unread.cnt, 0)    AS unread_count,
      last.id                    AS last_id,
      last.body                  AS last_body,
      last."imageKey"            AS last_image_key,
      last."createdAt"           AS last_created_at,
      last.sender_username       AS last_sender_username
    FROM "Activity" a
    JOIN "ActivityParticipant" me
      ON me."activityId" = a.id AND me."userId" = ${userId}
    JOIN "ActivityParticipant" host
      ON host."activityId" = a.id AND host."role" = 'HOST'
    LEFT JOIN LATERAL (
      SELECT m.id, m.body, m."imageKey", m."createdAt",
             prof.username AS sender_username
      FROM "ChatMessage" m
      JOIN "Profile" prof ON prof."userId" = m."senderUserId"
      WHERE m."activityId" = a.id
      ORDER BY m."createdAt" DESC, m.id DESC
      LIMIT 1
    ) last ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS cnt
      FROM "ChatMessage" m
      WHERE m."activityId" = a.id
        AND m."senderUserId" != ${userId}
        AND (me."lastReadAt" IS NULL OR m."createdAt" > me."lastReadAt")
    ) unread ON true
    ORDER BY COALESCE(last."createdAt", a."startsAt") DESC
  `;

  return rows.map((r) => ({
    activityId: r.activity_id,
    title: r.title,
    emoji: r.emoji,
    startsAt: r.starts_at,
    hostUserId: r.host_user_id,
    unreadCount: Number(r.unread_count),
    lastMessageId: r.last_id,
    lastBody: r.last_body,
    lastImageKey: r.last_image_key,
    lastCreatedAt: r.last_created_at,
    lastSenderUsername: r.last_sender_username,
  }));
}
