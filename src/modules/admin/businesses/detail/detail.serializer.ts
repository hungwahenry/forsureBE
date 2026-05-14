import type { Business, BusinessCategory, User } from '@prisma/client';
import type { StorageProvider } from '../../../../storage/storage.interface';

export interface AdminBusinessDetail {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  shortDescription: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  category: {
    id: string;
    code: string;
    label: string;
  } | null;
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

type BusinessWithRelations = Business & {
  suspendedBy: Pick<User, 'id' | 'email'> | null;
  category: BusinessCategory | null;
};

export function serializeAdminBusinessDetail(
  storage: StorageProvider,
  business: BusinessWithRelations,
  counts: AdminBusinessDetail['counts'],
): AdminBusinessDetail {
  return {
    id: business.id,
    slug: business.slug,
    name: business.name,
    logoUrl: business.logoKey ? storage.publicUrl(business.logoKey) : null,
    coverPhotoUrl: business.coverPhotoKey
      ? storage.publicUrl(business.coverPhotoKey)
      : null,
    shortDescription: business.shortDescription,
    supportEmail: business.supportEmail,
    supportPhone: business.supportPhone,
    category: business.category
      ? {
          id: business.category.id,
          code: business.category.code,
          label: business.category.label,
        }
      : null,
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
