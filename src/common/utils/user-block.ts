import { Prisma } from '@prisma/client';

export function notBlockedSql(
  viewerUserId: string,
  otherParty: Prisma.Sql,
): Prisma.Sql {
  return Prisma.sql`NOT EXISTS (
    SELECT 1 FROM "UserBlock" b
    WHERE (b."blockerId" = ${viewerUserId} AND b."blockedId" = ${otherParty})
       OR (b."blockerId" = ${otherParty} AND b."blockedId" = ${viewerUserId})
  )`;
}
