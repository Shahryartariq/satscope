/**
 * Keeps Satscope inside the UniSat free plan (30,000 calls a month ≈ 1,000 a day)
 * and stops one visitor from using it all. Counts live per function instance,
 * which is a soft limit, but cached results mean most visits cost nothing.
 */

const DAY_MS = 86_400_000;
const DAILY_UNITS = Number(process.env.UNISAT_DAILY_BUDGET || 900);

let dayStart = Date.now();
let used = 0;

export function spendUnits(units: number, now = Date.now()): boolean {
  if (now - dayStart >= DAY_MS) {
    dayStart = now;
    used = 0;
  }
  if (used + units > DAILY_UNITS) return false;
  used += units;
  return true;
}

/** Per-visitor limit on fresh checkups: `limit` per `windowMs`. */
const WINDOW_MS = 10 * 60_000;
const VISITOR_LIMIT = 30;
const hits = new Map<string, number[]>();

export function allowVisitor(id: string, now = Date.now(), limit = VISITOR_LIMIT, windowMs = WINDOW_MS): boolean {
  const recent = (hits.get(id) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(id, recent);
    return false;
  }
  recent.push(now);
  hits.set(id, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  }
  return true;
}

export function resetBudgetsForTests(): void {
  dayStart = Date.now();
  used = 0;
  hits.clear();
}
