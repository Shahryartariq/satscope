import "server-only";
import { cached } from "./cache";
import { fetchJson, UpstreamError } from "./http";
import { spendUnits } from "./budget";
import type { InscriptionRef, RuneAmount, RuneBalance } from "./types";

/**
 * Ordinals and Runes data from the UniSat Open API (https://open-api.unisat.io).
 * Needs UNISAT_API_KEY; the free plan allows 30,000 calls a month.
 */

const BASE = "https://open-api.unisat.io";
const PAGE = 100;
const MAX_PAGES = 5;
const MAX_RUNES_PER_ADDRESS = 12;

interface Envelope<T> {
  code: number;
  msg: string;
  data: T | null;
}

export interface UnisatInscriptionUtxo {
  txid: string;
  vout: number;
  satoshi: number;
  inscriptions: {
    inscriptionId: string;
    inscriptionNumber?: number;
    isBRC20?: boolean;
    moved?: boolean;
    offset?: number;
  }[];
}

export interface UnisatRuneBalance {
  amount: string;
  runeid: string;
  rune: string;
  spacedRune: string;
  symbol: string;
  divisibility: number;
}

export interface UnisatRuneUtxo {
  txid: string;
  vout: number;
  satoshi: number;
  runes: UnisatRuneBalance[];
}

export function hasUnisatKey(): boolean {
  return Boolean(process.env.UNISAT_API_KEY);
}

async function call<T>(path: string): Promise<T> {
  const key = process.env.UNISAT_API_KEY;
  if (!key) throw new UpstreamError("UniSat API key not set");
  if (!spendUnits(1)) throw new UpstreamError("Daily UniSat budget used up");
  const body = await fetchJson<Envelope<T>>(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${key}` },
    timeoutMs: 10_000,
  });
  if (body.code !== 0 || body.data == null) throw new UpstreamError(`UniSat: ${body.msg || "no data"}`);
  return body.data;
}

export function mapRune(r: UnisatRuneBalance): RuneAmount {
  return {
    id: r.runeid,
    name: r.spacedRune || r.rune,
    amount: r.amount,
    divisibility: r.divisibility ?? 0,
    symbol: r.symbol || "",
  };
}

export function mapInscriptions(u: UnisatInscriptionUtxo): InscriptionRef[] {
  return (u.inscriptions ?? []).map((i) => ({ id: i.inscriptionId, number: i.inscriptionNumber }));
}

async function inscriptionUtxos(address: string): Promise<UnisatInscriptionUtxo[]> {
  const all: UnisatInscriptionUtxo[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await call<{ total: number; utxo: UnisatInscriptionUtxo[] }>(
      `/v1/indexer/address/${address}/inscription-utxo-data?cursor=${page * PAGE}&size=${PAGE}`,
    );
    all.push(...(data.utxo ?? []));
    if (all.length >= data.total || (data.utxo ?? []).length < PAGE) break;
  }
  return all;
}

async function runeBalances(address: string): Promise<UnisatRuneBalance[]> {
  const data = await call<{ total: number; detail: UnisatRuneBalance[] }>(
    `/v1/indexer/address/${address}/runes/balance-list?start=0&limit=${PAGE}`,
  );
  return data.detail ?? [];
}

async function runeUtxos(address: string, runeId: string): Promise<UnisatRuneUtxo[]> {
  const data = await call<{ total: number; utxo: UnisatRuneUtxo[] }>(
    `/v1/indexer/address/${address}/runes/${encodeURIComponent(runeId)}/utxo?start=0&limit=${PAGE}`,
  );
  return data.utxo ?? [];
}

export interface OrdinalsOverlay {
  /** outpoint → inscriptions */
  inscriptions: Record<string, InscriptionRef[]>;
  /** outpoint → runes */
  runes: Record<string, RuneAmount[]>;
  balances: RuneBalance[];
}

export function buildOverlay(
  insUtxos: UnisatInscriptionUtxo[],
  balances: UnisatRuneBalance[],
  runeUtxoLists: UnisatRuneUtxo[][],
): OrdinalsOverlay {
  const inscriptions: Record<string, InscriptionRef[]> = {};
  for (const u of insUtxos) {
    const refs = mapInscriptions(u);
    if (refs.length) inscriptions[`${u.txid}:${u.vout}`] = refs;
  }
  const runes: Record<string, RuneAmount[]> = {};
  for (const list of runeUtxoLists) {
    for (const u of list) {
      const key = `${u.txid}:${u.vout}`;
      const existing = runes[key] ?? [];
      for (const r of u.runes ?? []) if (!existing.some((e) => e.id === r.runeid)) existing.push(mapRune(r));
      runes[key] = existing;
    }
  }
  return { inscriptions, runes, balances: balances.map(mapRune) };
}

/** Inscriptions and Runes per coin for one address. Cached for 10 minutes. */
export async function getOrdinalsOverlay(address: string): Promise<OrdinalsOverlay> {
  return cached(`ord:${address}`, 600, async () => {
    const [ins, balances] = await Promise.all([inscriptionUtxos(address), runeBalances(address)]);
    const lists = await Promise.all(balances.slice(0, MAX_RUNES_PER_ADDRESS).map((b) => runeUtxos(address, b.runeid)));
    return buildOverlay(ins, balances, lists);
  });
}
