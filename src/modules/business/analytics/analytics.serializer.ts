export interface AnalyticsWindow {
  from: string;
  to: string;
  days: number;
}

export interface DailyPoint {
  date: string;
  picks: number;
  confirmed: number;
  spendCents: number;
}

export interface HourBucket {
  hour: number;
  picks: number;
  confirmed: number;
}

export interface DayOfWeekBucket {
  dayOfWeek: number;
  picks: number;
  confirmed: number;
}

export interface PerformanceTotals {
  picks: number;
  confirmed: number;
  spendCents: number;
  conversionPct: number | null;
  picksPrior: number;
  confirmedPrior: number;
  spendCentsPrior: number;
}

export interface PerformanceAnalyticsDto {
  window: AnalyticsWindow;
  totals: PerformanceTotals;
  daily: DailyPoint[];
  hourly: HourBucket[];
  dayOfWeek: DayOfWeekBucket[];
}

export interface VenueAnalyticsRow {
  id: string;
  placeName: string;
  isPaused: boolean;
  createdAt: string;
  picks: number;
  confirmed: number;
  spendCents: number;
  conversionPct: number | null;
  lastPickAt: string | null;
}

export interface VenuesAnalyticsDto {
  window: AnalyticsWindow;
  venues: VenueAnalyticsRow[];
  dormantVenueIds: string[];
}

export interface BoostAnalyticsRow {
  id: string;
  activityId: string;
  activityEmoji: string;
  activityTitle: string;
  startsAt: string;
  endsAt: string;
  cancelledAt: string | null;
  chargedCents: number;
  isOverage: boolean;
  state: 'live' | 'scheduled' | 'ended' | 'cancelled';
  picksDuringBoost: number;
  confirmedDuringBoost: number;
  pickRevenueCents: number;
  costPerPickCents: number | null;
}

export interface BoostsAnalyticsDto {
  window: AnalyticsWindow;
  totals: {
    totalBoosts: number;
    overageBoosts: number;
    freeBoosts: number;
    totalChargedCents: number;
    totalPicksDuringBoosts: number;
    totalConfirmedDuringBoosts: number;
  };
  boosts: BoostAnalyticsRow[];
}

export interface SpendBucket {
  bucket: string;
  pickSpendCents: number;
  boostSpendCents: number;
}

export interface SpendAnalyticsDto {
  window: AnalyticsWindow;
  granularity: 'day' | 'week' | 'month';
  totals: {
    pickSpendCents: number;
    boostSpendCents: number;
    totalSpendCents: number;
    pickSpendCentsPrior: number;
    boostSpendCentsPrior: number;
  };
  buckets: SpendBucket[];
}
