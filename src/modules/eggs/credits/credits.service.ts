import { Injectable } from '@nestjs/common';
import { EggsService } from '../eggs.service';

export const CREDITS_EGG_CODE = 'credits';

export interface CreditsDiscoverResult {
  rank: number;
  total: number;
  discoveredAt: string;
}

@Injectable()
export class CreditsService {
  constructor(private readonly eggs: EggsService) {}

  async discover(userId: string): Promise<CreditsDiscoverResult> {
    const { discoveredAt } = await this.eggs.record(userId, CREDITS_EGG_CODE);
    const [rank, total] = await Promise.all([
      this.eggs.countDiscoveriesUpTo(CREDITS_EGG_CODE, discoveredAt),
      this.eggs.countDiscoveries(CREDITS_EGG_CODE),
    ]);
    return {
      rank,
      total,
      discoveredAt: discoveredAt.toISOString(),
    };
  }
}
