import { Prisma } from '@prisma/client';

interface BusinessStateFields {
  verifiedAt: Date | null;
  suspendedAt: Date | null;
  autoPausedAt: Date | null;
}

export function isBusinessPubliclyActive(b: BusinessStateFields): boolean {
  return (
    b.verifiedAt !== null && b.suspendedAt === null && b.autoPausedAt === null
  );
}

/** Prisma.sql fragment for raw queries; pass the alias of the Business row. */
export function businessPubliclyActiveSql(alias: string): Prisma.Sql {
  const a = Prisma.raw(`"${alias}"`);
  return Prisma.sql`${a}."verifiedAt" IS NOT NULL AND ${a}."suspendedAt" IS NULL AND ${a}."autoPausedAt" IS NULL`;
}
