import type { Business } from '@prisma/client';
import type { StorageProvider } from '../../../../storage/storage.interface';

export interface AdminBusinessListItem {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  verifiedAt: string | null;
  suspendedAt: string | null;
  autoPausedAt: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null;
  createdAt: string;
}

export function serializeAdminBusinessListItem(
  storage: StorageProvider,
  row: Business,
): AdminBusinessListItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    logoUrl: row.logoKey ? storage.publicUrl(row.logoKey) : null,
    verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
    suspendedAt: row.suspendedAt ? row.suspendedAt.toISOString() : null,
    autoPausedAt: row.autoPausedAt ? row.autoPausedAt.toISOString() : null,
    stripeSubscriptionId: row.stripeSubscriptionId,
    stripeSubscriptionStatus: row.stripeSubscriptionStatus,
    createdAt: row.createdAt.toISOString(),
  };
}
