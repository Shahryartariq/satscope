const SATS_PER_BTC = 100_000_000;

export function satsToBtc(sats: number): number {
  return sats / SATS_PER_BTC;
}

/** 0.00012345 BTC, trimmed to significant digits but never in scientific notation. */
export function formatBtc(sats: number): string {
  const btc = satsToBtc(sats);
  if (sats === 0) return "0 BTC";
  const fixed = btc.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
  return `${fixed} BTC`;
}

export function formatSats(sats: number): string {
  return `${Math.round(sats).toLocaleString("en-US")} sats`;
}

export function formatUsd(sats: number, usdPerBtc: number | null): string | null {
  if (usdPerBtc == null) return null;
  const usd = satsToBtc(sats) * usdPerBtc;
  if (usd !== 0 && Math.abs(usd) < 0.01) return "< $0.01";
  return usd.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: usd >= 1000 ? 0 : 2,
  });
}

/** Fee rates are often below 1 sat/vB now; show one decimal under 10. */
export function formatRate(rate: number): string {
  const r = rate < 10 ? Math.round(rate * 100) / 100 : Math.round(rate);
  return `${r} sat/vB`;
}

export function formatCount(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}

/** Rune amounts are raw integers with a divisibility; format without floating point loss. */
export function formatRuneAmount(raw: string, divisibility: number): string {
  if (!/^\d+$/.test(raw)) return raw;
  if (divisibility <= 0) return BigInt(raw).toLocaleString("en-US");
  const padded = raw.padStart(divisibility + 1, "0");
  const whole = padded.slice(0, -divisibility);
  const frac = padded.slice(-divisibility).replace(/0+$/, "");
  const wholeFmt = BigInt(whole).toLocaleString("en-US");
  return frac ? `${wholeFmt}.${frac}` : wholeFmt;
}

export function outpoint(c: { txid: string; vout: number }): string {
  return `${c.txid}:${c.vout}`;
}

export function shortOutpoint(op: string): string {
  const [txid, vout] = op.split(":");
  return `${txid?.slice(0, 8)}…:${vout}`;
}

export function relativeTime(unixSeconds: number, now = Date.now()): string {
  const diff = Math.max(0, now / 1000 - unixSeconds);
  const day = 86_400;
  if (diff < 3600) return `${Math.max(1, Math.round(diff / 60))} min ago`;
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`;
  if (diff < day) return plural(Math.round(diff / 3600), "hour");
  if (diff < 30 * day) return plural(Math.round(diff / day), "day");
  if (diff < 365 * day) return plural(Math.round(diff / (30 * day)), "month");
  return `${(diff / (365 * day)).toFixed(1)} years ago`;
}
