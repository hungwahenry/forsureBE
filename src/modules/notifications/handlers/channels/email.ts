import { Logger } from '@nestjs/common';
import type { HandlerContext } from '../handler.types';

const log = new Logger('EmailChannel');

export interface EmailSpec {
  template: string;
  data: Record<string, unknown>;
}

export async function sendEmail(
  ctx: HandlerContext,
  recipientUserIds: string[],
  spec: EmailSpec,
): Promise<void> {
  if (recipientUserIds.length === 0) return;

  const recipients = await fetchEmails(ctx, recipientUserIds);
  await Promise.all(
    recipients.map(async ({ userId, email }) => {
      try {
        await ctx.email.send({ to: email, template: spec.template, data: spec.data });
      } catch (err) {
        log.error({ err, userId, template: spec.template }, 'Email send failed');
      }
    }),
  );
}

async function fetchEmails(
  ctx: HandlerContext,
  userIds: string[],
): Promise<{ userId: string; email: string }[]> {
  const rows = await ctx.prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true },
  });
  return rows.map((r) => ({ userId: r.id, email: r.email }));
}
