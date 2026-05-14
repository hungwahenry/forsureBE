import type {
  BoostsAnalyticsDto,
  PerformanceAnalyticsDto,
  SpendAnalyticsDto,
  VenuesAnalyticsDto,
} from './analytics.serializer';

function escapeCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: (string | number | null)[][]): string {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\n') + '\n';
}

function dollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function performanceCsv(dto: PerformanceAnalyticsDto): string {
  const rows: (string | number | null)[][] = [
    ['date', 'picks', 'confirmed', 'spend_usd'],
  ];
  for (const d of dto.daily) {
    rows.push([d.date, d.picks, d.confirmed, dollars(d.spendCents)]);
  }
  return toCsv(rows);
}

export function venuesCsv(dto: VenuesAnalyticsDto): string {
  const rows: (string | number | null)[][] = [
    [
      'venue_id',
      'venue_name',
      'paused',
      'picks',
      'confirmed',
      'conversion_pct',
      'spend_usd',
      'last_pick_at',
    ],
  ];
  for (const v of dto.venues) {
    rows.push([
      v.id,
      v.placeName,
      v.isPaused ? 'true' : 'false',
      v.picks,
      v.confirmed,
      v.conversionPct ?? '',
      dollars(v.spendCents),
      v.lastPickAt ?? '',
    ]);
  }
  return toCsv(rows);
}

export function boostsCsv(dto: BoostsAnalyticsDto): string {
  const rows: (string | number | null)[][] = [
    [
      'boost_id',
      'activity_id',
      'activity_title',
      'state',
      'starts_at',
      'ends_at',
      'cancelled_at',
      'charged_usd',
      'is_overage',
      'picks_during_boost',
      'confirmed_during_boost',
      'pick_revenue_usd',
      'cost_per_pick_usd',
    ],
  ];
  for (const b of dto.boosts) {
    rows.push([
      b.id,
      b.activityId,
      b.activityTitle,
      b.state,
      b.startsAt,
      b.endsAt,
      b.cancelledAt ?? '',
      dollars(b.chargedCents),
      b.isOverage ? 'true' : 'false',
      b.picksDuringBoost,
      b.confirmedDuringBoost,
      dollars(b.pickRevenueCents),
      b.costPerPickCents === null ? '' : dollars(b.costPerPickCents),
    ]);
  }
  return toCsv(rows);
}

export function spendCsv(dto: SpendAnalyticsDto): string {
  const rows: (string | number | null)[][] = [
    ['bucket', 'pick_spend_usd', 'boost_spend_usd', 'total_usd'],
  ];
  for (const b of dto.buckets) {
    rows.push([
      b.bucket,
      dollars(b.pickSpendCents),
      dollars(b.boostSpendCents),
      dollars(b.pickSpendCents + b.boostSpendCents),
    ]);
  }
  return toCsv(rows);
}
