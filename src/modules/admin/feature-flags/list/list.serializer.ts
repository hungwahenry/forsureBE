import type { FeatureFlag, User } from '@prisma/client';

export interface AdminFeatureFlagItem {
  key: string;
  enabled: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: { id: string; email: string } | null;
}

type Row = FeatureFlag & {
  updatedBy: Pick<User, 'id' | 'email'> | null;
};

export function serializeAdminFeatureFlag(row: Row): AdminFeatureFlagItem {
  return {
    key: row.key,
    enabled: row.enabled,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy
      ? { id: row.updatedBy.id, email: row.updatedBy.email }
      : null,
  };
}
