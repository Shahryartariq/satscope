import "server-only";
import { getCache } from "@vercel/functions";

/**
 * Vercel Runtime Cache shared by all function instances in a region
 * (an in-memory cache locally). Identical lookups running at the same
 * moment share one upstream request.
 */
const cache = getCache({ namespace: "satscope-v1" });
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  try {
    const hit = (await cache.get(key)) as { v: T } | null;
    if (hit && typeof hit === "object" && "v" in hit) return hit.v;
  } catch {
    // A cache outage should never take the site down.
  }
  const running = inflight.get(key) as Promise<T> | undefined;
  if (running) return running;
  const p = (async () => {
    try {
      const v = await load();
      cache.set(key, { v }, { ttl: ttlSeconds, name: key.split(":")[0] }).catch(() => {});
      return v;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}
