import type { Business, User } from '@prisma/client';
import type { StorageProvider } from '../../../../storage/storage.interface';

export interface AdminBusinessDetail {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  verifiedAt: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  suspendedBy: { id: string; email: string } | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null;
  stripeSubscriptionStatusAt: string | null;
  autoPausedAt: string | null;
  createdAt: string;
  updatedAt: string;
  counts: {
    members: number;
    venues: number;
    boostsActive: number;
    boostsAllTime: number;
    recentVenueFlags: number;
  };
}

type BusinessWithSuspender = Business & {
  suspendedBy: Pick<User, 'id' | 'email'> | null;
};

export function serializeAdminBusinessDetail(
  storage: StorageProvider,
  business: BusinessWithSuspender,
  counts: AdminBusinessDetail['counts'],
): AdminBusinessDetail {
  return {
    id: business.id,
    slug: business.slug,
    name: business.name,
    logoUrl: business.logoKey ? storage.publicUrl(business.logoKey) : null,
    verifiedAt: business.verifiedAt ? business.verifiedAt.toISOString() : null,
    suspendedAt: business.suspendedAt
      ? business.suspendedAt.toISOString()
      : null,
    suspendedReason: business.suspendedReason,
    suspendedBy: business.suspendedBy
      ? { id: business.suspendedBy.id, email: business.suspendedBy.email }
      : null,
    stripeCustomerId: business.stripeCustomerId,
    stripeSubscriptionId: business.stripeSubscriptionId,
    stripeSubscriptionStatus: business.stripeSubscriptionStatus,
    stripeSubscriptionStatusAt: business.stripeSubscriptionStatusAt
      ? business.stripeSubscriptionStatusAt.toISOString()
      : null,
    autoPausedAt: business.autoPausedAt
      ? business.autoPausedAt.toISOString()
      : null,
    createdAt: business.createdAt.toISOString(),
    updatedAt: business.updatedAt.toISOString(),
    counts,
  };
}
