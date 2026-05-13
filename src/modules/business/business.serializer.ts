import type { Business, BusinessMember, BusinessMemberRole } from '@prisma/client';
import type { StorageProvider } from '../../storage/storage.interface';

export interface BusinessMembershipDto {
  businessId: string;
  businessSlug: string;
  businessName: string;
  businessLogoUrl: string | null;
  verifiedAt: string | null;
  suspendedAt: string | null;
  role: BusinessMemberRole;
}

type MembershipRow = BusinessMember & { business: Business };

export function serializeBusinessMembership(
  storage: StorageProvider,
  row: MembershipRow,
): BusinessMembershipDto {
  return {
    businessId: row.business.id,
    businessSlug: row.business.slug,
    businessName: row.business.name,
    businessLogoUrl: row.business.logoKey
      ? storage.publicUrl(row.business.logoKey)
      : null,
    verifiedAt: row.business.verifiedAt
      ? row.business.verifiedAt.toISOString()
      : null,
    suspendedAt: row.business.suspendedAt
      ? row.business.suspendedAt.toISOString()
      : null,
    role: row.role,
  };
}
