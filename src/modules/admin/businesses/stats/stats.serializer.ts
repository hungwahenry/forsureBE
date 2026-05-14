export interface AdminBusinessesStats {
  activeSubscriptions: number;
  activeBoosts: number;
  suspendedCount: number;
  autoPausedCount: number;
  venuePicks30d: {
    count: number;
    totalCents: number;
  };
}

export function serializeAdminBusinessesStats(
  raw: AdminBusinessesStats,
): AdminBusinessesStats {
  return raw;
}
