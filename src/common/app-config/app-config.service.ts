import { Injectable, Logger } from '@nestjs/common';
import type { AppConfig, ConfigValueType } from '@prisma/client';
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
    return this.readNumber(key, 'INT');
  }

  async getFloat(key: string): Promise<number> {
    return this.readNumber(key, 'FLOAT');
  }

  async getBoolean(key: string): Promise<boolean> {
    const row = await this.requireRow(key, 'BOOLEAN');
    return row.value === true;
  }

  async getString(key: string): Promise<string> {
    const row = await this.requireRow(key, 'STRING');
    return row.value as string;
  }

  async listClientExposed(): Promise<
    Record<string, number | boolean | string>
  > {
    await this.ensureFresh();
    const out: Record<string, number | boolean | string> = {};
    for (const row of this.cache.values()) {
      if (row.clientExposed) {
        out[row.key] = row.value as number | boolean | string;
      }
    }
    return out;
  }

  invalidate(): void {
    this.expiresAt = 0;
  }

  private async readNumber(
    key: string,
    type: Extract<ConfigValueType, 'INT' | 'FLOAT'>,
  ): Promise<number> {
    const row = await this.requireRow(key, type);
    return Number(row.value);
  }

  private async requireRow(
    key: string,
    expectedType: ConfigValueType,
  ): Promise<AppConfig> {
    await this.ensureFresh();
    const row = this.cache.get(key);
    if (!row) {
      throw new Error(`AppConfig key not found: '${key}' (missing seed?)`);
    }
    if (row.valueType !== expectedType) {
      throw new Error(
        `AppConfig key '${key}' is ${row.valueType}, requested ${expectedType}`,
      );
    }
    return row;
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
