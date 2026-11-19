/** Parses "15m", "7d", "900s", "2h" or a plain number of seconds into ms. */
export function parseDurationMs(value: string | number | undefined, fallbackMs: number): number {
  if (value === undefined) return fallbackMs;
  if (typeof value === 'number') return value * 1000;
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/i.exec(value.trim());
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = (match[2] ?? 's').toLowerCase();
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * (multipliers[unit] ?? 1000);
}
