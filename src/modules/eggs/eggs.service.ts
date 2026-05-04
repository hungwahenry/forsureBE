import { Injectable } from '@nestjs/common';
import { createId } from '../../common/utils/id';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EggsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Idempotent: returns the original discoveredAt if already recorded. */
  async record(userId: string, eggCode: string): Promise<{ discoveredAt: Date }> {
    const discovery = await this.prisma.easterEggDiscovery.upsert({
      where: { userId_eggCode: { userId, eggCode } },
      create: { id: createId('egd'), userId, eggCode },
      update: {},
      select: { discoveredAt: true },
    });
    return { discoveredAt: discovery.discoveredAt };
  }

  /** Total users who've discovered this egg. */
  countDiscoveries(eggCode: string): Promise<number> {
    return this.prisma.easterEggDiscovery.count({ where: { eggCode } });
  }

  /** How many users had discovered this egg by the given timestamp (inclusive). */
  countDiscoveriesUpTo(eggCode: string, at: Date): Promise<number> {
    return this.prisma.easterEggDiscovery.count({
      where: { eggCode, discoveredAt: { lte: at } },
    });
  }
}
