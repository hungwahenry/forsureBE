import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../config/env.schema';
import { PrismaService } from '../../../prisma/prisma.service';

export interface BoostPreviewDto {
  willCharge: boolean;
  chargeCents: number;
  freeBoostsUsed: number;
  freeBoostsCap: number;
  durationHours: number;
}

export interface BoostCycleSummaryDto {
  freeBoostsUsed: number;
  freeBoostsCap: number;
  cycleSpendCents: number;
  overageCount: number;
  activeCount: number;
  overageCentsPerBoost: number;
  cycleWindowDays: number;
}

const CYCLE_WINDOW_DAYS = 30;
const CYCLE_WINDOW_MS = CYCLE_WINDOW_DAYS * 86_400_000;

@Injectable()
export class BoostsPricingService {
  readonly freePerCycle: number;
  readonly overageCents: number;
  readonly durationHours: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.freePerCycle = config.get('BOOST_FREE_PER_CYCLE', { infer: true });
    this.overageCents = config.get('BOOST_OVERAGE_CENTS', { infer: true });
    this.durationHours = config.get('BOOST_DURATION_HOURS', { infer: true });
  }

  async preview(businessId: string): Promise<BoostPreviewDto> {
    const used = await this.countCycleBoosts(businessId);
    const willCharge = used >= this.freePerCycle;
    return {
      willCharge,
      chargeCents: willCharge ? this.overageCents : 0,
      freeBoostsUsed: used,
      freeBoostsCap: this.freePerCycle,
      durationHours: this.durationHours,
    };
  }

  async summarizeCycle(businessId: string): Promise<BoostCycleSummaryDto> {
    const cutoff = new Date(Date.now() - CYCLE_WINDOW_MS);
    const cycleRows = await this.prisma.activityBoost.findMany({
      where: { businessId, createdAt: { gte: cutoff } },
      select: { chargedCents: true, isOverage: true },
    });
    const activeCount = await this.prisma.activityBoost.count({
      where: {
        businessId,
        cancelledAt: null,
        startsAt: { lte: new Date() },
        endsAt: { gt: new Date() },
      },
    });
    return {
      freeBoostsUsed: cycleRows.length,
      freeBoostsCap: this.freePerCycle,
      cycleSpendCents: cycleRows.reduce((sum, r) => sum + r.chargedCents, 0),
      overageCount: cycleRows.filter((r) => r.isOverage).length,
      activeCount,
      overageCentsPerBoost: this.overageCents,
      cycleWindowDays: CYCLE_WINDOW_DAYS,
    };
  }

  async countCycleBoosts(businessId: string): Promise<number> {
    const cutoff = new Date(Date.now() - CYCLE_WINDOW_MS);
    return this.prisma.activityBoost.count({
      where: { businessId, createdAt: { gte: cutoff } },
    });
  }
}