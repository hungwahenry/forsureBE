import type { BusinessCategory } from '@prisma/client';

export interface BusinessCategoryDto {
  id: string;
  code: string;
  label: string;
  description: string | null;
  iconName: string | null;
}

export function serializeBusinessCategory(
  row: BusinessCategory,
): BusinessCategoryDto {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    description: row.description,
    iconName: row.iconName,
  };
}
