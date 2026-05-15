import type { AppConfig, ConfigValueType } from '@prisma/client';

export interface AdminConfigItem {
  key: string;
  value: unknown;
  defaultValue: unknown;
  valueType: ConfigValueType;
  minValue: number | null;
  maxValue: number | null;
  category: string;
  label: string;
  description: string;
  updatedAt: string;
}

export function serializeAdminConfig(row: AppConfig): AdminConfigItem {
  return {
    key: row.key,
    value: row.value,
    defaultValue: row.defaultValue,
    valueType: row.valueType,
    minValue: row.minValue,
    maxValue: row.maxValue,
    category: row.category,
    label: row.label,
    description: row.description,
    updatedAt: row.updatedAt.toISOString(),
  };
}
