import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const CACHE_TTL_MS = 30_000;

interface CachedFlag {
  enabled: boolean;
  expiresAt: number;
}

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  private readonly cache = new Map<string, CachedFlag>();

  constructor(private readonly prisma: PrismaService) {}

  async isEnabled(key: string, defaultValue = false): Promise<boolean> {
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) return cached.enabled;

    try {
      const row = await this.prisma.featureFlag.findUnique({
        where: { key },
        select: { enabled: true },
      });
      const enabled = row?.enabled ?? defaultValue;
      this.cache.set(key, { enabled, expiresAt: now + CACHE_TTL_MS });
      return enabled;
    } catch (err) {
      this.logger.warn(`Failed to read feature flag '${key}': ${err}`);
      return defaultValue;
    }
  }

  invalidate(key?: string): void {
    if (key) this.cache.delete(key);
    else this.cache.clear();
  }
}
