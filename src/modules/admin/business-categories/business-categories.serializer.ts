import type { BusinessCategory } from '@prisma/client';

export interface AdminBusinessCategoryItem {
  id: string;
  code: string;
  label: string;
  description: string | null;
  iconName: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  businessesCount: number;
}

export function serializeAdminBusinessCategory(
  row: BusinessCategory,
  businessesCount: number,
): AdminBusinessCategoryItem {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    description: row.description,
    iconName: row.iconName,
    active: row.active,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    businessesCount,
  };
}
