import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../common/app-config/app-config.service';
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

const DAY_MS = 86_400_000;

@Injectable()
export class BoostsPricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
  ) {}

  freePerCycle(): Promise<number> {
    return this.appConfig.getInt('boost.free_per_cycle');
  }

  overageCents(): Promise<number> {
    return this.appConfig.getInt('boost.overage_cents');
  }

  durationHours(): Promise<number> {
    return this.appConfig.getInt('boost.duration_hours');
  }

  cycleWindowDays(): Promise<number> {
    return this.appConfig.getInt('boost.cycle_window_days');
  }

  async preview(businessId: string): Promise<BoostPreviewDto> {
    const [used, freeBoostsCap, overageCents, durationHours] =
      await Promise.all([
        this.countCycleBoosts(businessId),
        this.freePerCycle(),
        this.overageCents(),
        this.durationHours(),
      ]);
    const willCharge = used >= freeBoostsCap;
    return {
      willCharge,
      chargeCents: willCharge ? overageCents : 0,
      freeBoostsUsed: used,
      freeBoostsCap,
      durationHours,
    };
  }

  async summarizeCycle(businessId: string): Promise<BoostCycleSummaryDto> {
    const [freeBoostsCap, overageCents, cycleWindowDays] = await Promise.all([
      this.freePerCycle(),
      this.overageCents(),
      this.cycleWindowDays(),
    ]);
    const cutoff = new Date(Date.now() - cycleWindowDays * DAY_MS);
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
      freeBoostsUsed: cycleRows.filter((r) => !r.isOverage).length,
      freeBoostsCap,
      cycleSpendCents: cycleRows.reduce((sum, r) => sum + r.chargedCents, 0),
      overageCount: cycleRows.filter((r) => r.isOverage).length,
      activeCount,
      overageCentsPerBoost: overageCents,
      cycleWindowDays,
    };
  }

  async countCycleBoosts(businessId: string): Promise<number> {
    const cycleWindowDays = await this.cycleWindowDays();
    const cutoff = new Date(Date.now() - cycleWindowDays * DAY_MS);
    return this.prisma.activityBoost.count({
      where: { businessId, createdAt: { gte: cutoff } },
    });
  }
}
