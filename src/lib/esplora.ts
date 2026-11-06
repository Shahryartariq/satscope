import "server-only";
import { cached } from "./cache";
import { fetchJson, fetchText, UpstreamError } from "./http";
import type { AddressStats, Coin, FeeRates } from "./types";

/**
 * Coins, address stats, fee rates and price come from an Esplora API
 * (mempool.space by default, blockstream.info as backup). No API key needed.
 */

export interface EsploraUtxo {
  txid: string;
  vout: number;
  value: number;
  status: { confirmed: boolean; block_height?: number; block_time?: number };
}

export interface EsploraAddress {
  chain_stats: { funded_txo_sum: number; spent_txo_sum: number; tx_count: number };
  mempool_stats: { funded_txo_sum: number; spent_txo_sum: number; tx_count: number };
}

const PRIMARY = (process.env.ESPLORA_URL || "https://mempool.space/api").replace(/\/$/, "");
const BACKUP = "https://blockstream.info/api";
const BASES = PRIMARY === BACKUP ? [PRIMARY] : [PRIMARY, BACKUP];

/** Esplora refuses addresses with too many coins; Satscope shows a friendly note instead. */
export class TooManyCoinsError extends Error {}

async function fromAny<T>(path: string, parse: (base: string) => Promise<T>): Promise<T> {
  let last: unknown;
  for (const base of BASES) {
    try {
      return await parse(base);
    } catch (err) {
      if (err instanceof UpstreamError && err.status === 400 && /too many/i.test(err.body ?? "")) {
        throw new TooManyCoinsError(path);
      }
      if (err instanceof UpstreamError && err.status === 400) throw err;
      last = err;
    }
  }
  throw last;
}

export function mapUtxo(u: EsploraUtxo): Coin {
  return {
    txid: u.txid,
    vout: u.vout,
    value: u.value,
    confirmed: u.status.confirmed,
    height: u.status.block_height,
    time: u.status.block_time,
    inscriptions: [],
    runes: [],
  };
}

export function mapStats(a: EsploraAddress): AddressStats {
  return {
    txCount: a.chain_stats.tx_count + a.mempool_stats.tx_count,
    receivedSats: a.chain_stats.funded_txo_sum + a.mempool_stats.funded_txo_sum,
    sentSats: a.chain_stats.spent_txo_sum + a.mempool_stats.spent_txo_sum,
    pendingTxCount: a.mempool_stats.tx_count,
  };
}

/** mempool.space /v1/fees/recommended shape. */
interface MempoolFees {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

export function mapMempoolFees(f: MempoolFees): FeeRates {
  return {
    fastest: f.fastestFee,
    halfHour: f.halfHourFee,
    hour: f.hourFee,
    economy: f.economyFee,
    minimum: f.minimumFee,
  };
}

/** blockstream.info /fee-estimates: confirmation target (blocks) → sat/vB. */
export function mapEstimates(e: Record<string, number>): FeeRates {
  const at = (target: number) => {
    const keys = Object.keys(e)
      .map(Number)
      .filter((k) => k >= target)
      .sort((a, b) => a - b);
    const k = keys[0] ?? Math.max(...Object.keys(e).map(Number));
    return Math.max(0.1, Math.round((e[String(k)] ?? 1) * 100) / 100);
  };
  const fastest = at(1);
  return { fastest, halfHour: at(3), hour: at(6), economy: at(144), minimum: Math.min(at(1008), at(144)) };
}

export async function getUtxos(address: string): Promise<Coin[]> {
  return cached(`utxo:${address}`, 60, () =>
    fromAny(`utxo:${address}`, (base) => fetchJson<EsploraUtxo[]>(`${base}/address/${address}/utxo`)),
  ).then((list) => list.map(mapUtxo));
}

export async function getAddressStats(address: string): Promise<AddressStats> {
  return cached(`addr:${address}`, 60, () =>
    fromAny(`addr:${address}`, (base) => fetchJson<EsploraAddress>(`${base}/address/${address}`)),
  ).then(mapStats);
}

export async function getFees(): Promise<FeeRates> {
  return cached("fees", 60, async () => {
    try {
      return mapMempoolFees(await fetchJson<MempoolFees>("https://mempool.space/api/v1/fees/recommended"));
    } catch {
      return mapEstimates(await fetchJson<Record<string, number>>(`${BACKUP}/fee-estimates`));
    }
  });
}

export async function getTipHeight(): Promise<number | null> {
  return cached("tip", 60, () =>
    fromAny("tip", async (base) => Number(await fetchText(`${base}/blocks/tip/height`))),
  ).catch(() => null);
}

export async function getUsdPrice(): Promise<number | null> {
  return cached("price", 300, async () => {
    try {
      const p = await fetchJson<{ USD?: number }>("https://mempool.space/api/v1/prices");
      if (p.USD && p.USD > 0) return p.USD;
    } catch {
      /* fall through */
    }
    try {
      const p = await fetchJson<{ bitcoin?: { usd?: number } }>(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      );
      return p.bitcoin?.usd ?? null;
    } catch {
      return null;
    }
  });
}
