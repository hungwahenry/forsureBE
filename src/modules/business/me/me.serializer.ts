import type { Business, BusinessCategory } from '@prisma/client';
import type { StorageProvider } from '../../../storage/storage.interface';

export interface OwnerBusinessDto {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  category: {
    id: string;
    code: string;
    label: string;
  } | null;
  verifiedAt: string | null;
  suspendedAt: string | null;
  autoPausedAt: string | null;
  stripeSubscriptionStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

type BusinessWithCategory = Business & { category: BusinessCategory | null };

export function serializeOwnerBusiness(
  storage: StorageProvider,
  business: BusinessWithCategory,
): OwnerBusinessDto {
  return {
    id: business.id,
    slug: business.slug,
    name: business.name,
    shortDescription: business.shortDescription,
    supportEmail: business.supportEmail,
    supportPhone: business.supportPhone,
    logoUrl: business.logoKey ? storage.publicUrl(business.logoKey) : null,
    coverPhotoUrl: business.coverPhotoKey
      ? storage.publicUrl(business.coverPhotoKey)
      : null,
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
    autoPausedAt: business.autoPausedAt
      ? business.autoPausedAt.toISOString()
      : null,
    stripeSubscriptionStatus: business.stripeSubscriptionStatus,
    createdAt: business.createdAt.toISOString(),
    updatedAt: business.updatedAt.toISOString(),
  };
}
