import { Injectable, Logger } from '@nestjs/common';
import type { AppConfig, ConfigValueType, Prisma } from '@prisma/client';
import { ErrorCode } from '../constants/error-codes';
import { AppException } from '../exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';

const CACHE_TTL_MS = 30_000;

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);
  private cache = new Map<string, AppConfig>();
  private expiresAt = 0;
  private refreshing: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getInt(key: string): Promise<number> {
    return this.read(key, 'INT');
  }

  async getFloat(key: string): Promise<number> {
    return this.read(key, 'FLOAT');
  }

  async getBoolean(key: string): Promise<boolean> {
    const row = await this.requireRow(key, 'BOOLEAN');
    return row.value === true;
  }

  async getString(key: string): Promise<string> {
    const row = await this.requireRow(key, 'STRING');
    return String(row.value);
  }

  async listAll(): Promise<AppConfig[]> {
    await this.ensureFresh();
    return [...this.cache.values()].sort((a, b) =>
      a.category === b.category
        ? a.key.localeCompare(b.key)
        : a.category.localeCompare(b.category),
    );
  }

  /** Admin write: validate against the row's type + bounds, then persist. */
  async updateValue(
    key: string,
    value: unknown,
    adminId: string,
  ): Promise<AppConfig> {
    const row = await this.requireRow(key);
    const validated = this.validate(row, value);
    const updated = await this.prisma.appConfig.update({
      where: { key },
      data: { value: validated as Prisma.InputJsonValue, updatedById: adminId },
    });
    this.invalidate();
    return updated;
  }

  /** Admin write: restore a key to its seeded default. */
  async resetToDefault(key: string, adminId: string): Promise<AppConfig> {
    const row = await this.requireRow(key);
    const updated = await this.prisma.appConfig.update({
      where: { key },
      data: {
        value: row.defaultValue as Prisma.InputJsonValue,
        updatedById: adminId,
      },
    });
    this.invalidate();
    return updated;
  }

  invalidate(): void {
    this.expiresAt = 0;
  }

  private async read(
    key: string,
    type: Extract<ConfigValueType, 'INT' | 'FLOAT'>,
  ): Promise<number> {
    const row = await this.requireRow(key, type);
    return Number(row.value);
  }

  private async requireRow(
    key: string,
    expectedType?: ConfigValueType,
  ): Promise<AppConfig> {
    await this.ensureFresh();
    const row = this.cache.get(key);
    if (!row) {
      throw new Error(`AppConfig key not found: '${key}' (missing seed?)`);
    }
    if (expectedType && row.valueType !== expectedType) {
      throw new Error(
        `AppConfig key '${key}' is ${row.valueType}, requested ${expectedType}`,
      );
    }
    return row;
  }

  private validate(row: AppConfig, value: unknown): number | boolean | string {
    if (row.valueType === 'BOOLEAN') {
      if (typeof value !== 'boolean') {
        throw new AppException(ErrorCode.VALIDATION_FAILED, {
          message: `${row.label} must be true or false.`,
        });
      }
      return value;
    }
    if (row.valueType === 'STRING') {
      if (typeof value !== 'string') {
        throw new AppException(ErrorCode.VALIDATION_FAILED, {
          message: `${row.label} must be text.`,
        });
      }
      return value;
    }
    // INT or FLOAT
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: `${row.label} must be a number.`,
      });
    }
    if (row.valueType === 'INT' && !Number.isInteger(value)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: `${row.label} must be a whole number.`,
      });
    }
    if (row.minValue !== null && value < row.minValue) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: `${row.label} cannot be below ${row.minValue}.`,
      });
    }
    if (row.maxValue !== null && value > row.maxValue) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: `${row.label} cannot be above ${row.maxValue}.`,
      });
    }
    return value;
  }

  private async ensureFresh(): Promise<void> {
    if (Date.now() < this.expiresAt && this.cache.size > 0) return;
    if (this.refreshing) {
      await this.refreshing;
      return;
    }
    this.refreshing = this.reload();
    try {
      await this.refreshing;
    } finally {
      this.refreshing = null;
    }
  }

  private async reload(): Promise<void> {
    const rows = await this.prisma.appConfig.findMany();
    const next = new Map<string, AppConfig>();
    for (const row of rows) next.set(row.key, row);
    this.cache = next;
    this.expiresAt = Date.now() + CACHE_TTL_MS;
    this.logger.debug(`AppConfig cache refreshed (${rows.length} keys)`);
  }
}
