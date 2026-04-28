const MULTIPLIERS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Parse a duration string like "15m" or "30d" into milliseconds. */
export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(duration);
  if (!match) throw new Error(`Invalid duration: ${duration}`);
  return parseInt(match[1], 10) * MULTIPLIERS[match[2]];
}
