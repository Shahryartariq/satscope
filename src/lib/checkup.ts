import "server-only";
import { normalizeAddress, parseAddress } from "./address";
import { buildReport } from "./analyze";
import { getAddressStats, getFees, getTipHeight, getUsdPrice, getUtxos, TooManyCoinsError } from "./esplora";
import { SAMPLE_MARKET, SAMPLE_SNAPSHOTS, isSampleMode } from "./sample";
import type { AddressRole, AddressSnapshot, MarketData, Report } from "./types";
import { getOrdinalsOverlay, hasUnisatKey } from "./unisat";

export interface Target {
  address: string;
  role: AddressRole;
}

export class CheckupError extends Error {
  constructor(
    message: string,
    readonly kind: "invalid" | "upstream",
  ) {
    super(message);
  }
}

export async function getMarket(): Promise<MarketData> {
  if (isSampleMode()) return SAMPLE_MARKET;
  const [fees, usd, tipHeight] = await Promise.all([
    // If no fee source answers, assume 1 sat/vB so the report still renders.
    getFees().catch(() => ({ fastest: 1, halfHour: 1, hour: 1, economy: 1, minimum: 1 })),
    getUsdPrice(),
    getTipHeight(),
  ]);
  return { fees, usd, tipHeight };
}

async function snapshot(target: Target): Promise<AddressSnapshot> {
  const type = parseAddress(target.address);
  if (!type) throw new CheckupError(`"${target.address}" is not a valid Bitcoin address`, "invalid");

  if (isSampleMode()) {
    const s = SAMPLE_SNAPSHOTS[target.address];
    if (s) return { ...s, role: target.role };
    return {
      address: target.address,
      type,
      role: target.role,
      stats: { txCount: 0, receivedSats: 0, sentSats: 0, pendingTxCount: 0 },
      coins: [],
      indexed: true,
      runeBalances: [],
    };
  }

  let stats;
  try {
    stats = await getAddressStats(target.address);
  } catch {
    throw new CheckupError("The Bitcoin data source isn't answering right now. Try again in a minute.", "upstream");
  }

  let coins: AddressSnapshot["coins"] = [];
  let tooManyCoins = false;
  try {
    coins = await getUtxos(target.address);
  } catch (err) {
    if (err instanceof TooManyCoinsError) tooManyCoins = true;
    else
      throw new CheckupError("The Bitcoin data source isn't answering right now. Try again in a minute.", "upstream");
  }

  let indexed = false;
  let runeBalances: AddressSnapshot["runeBalances"] = [];
  if (hasUnisatKey() && !tooManyCoins && coins.length > 0) {
    try {
      const overlay = await getOrdinalsOverlay(target.address);
      coins = coins.map((c) => {
        const key = `${c.txid}:${c.vout}`;
        return { ...c, inscriptions: overlay.inscriptions[key] ?? [], runes: overlay.runes[key] ?? [] };
      });
      runeBalances = overlay.balances;
      indexed = true;
    } catch {
      indexed = false;
    }
  } else if (coins.length === 0) {
    indexed = true; // nothing to check
  }

  return { address: target.address, type, role: target.role, stats, coins, indexed, runeBalances, tooManyCoins };
}

export function parseTargets(input: { address?: string; ordinals?: string; payment?: string }): Target[] {
  const out: Target[] = [];
  if (input.ordinals) out.push({ address: normalizeAddress(input.ordinals), role: "ordinals" });
  if (input.payment) {
    const p = normalizeAddress(input.payment);
    if (!out.some((t) => t.address === p)) out.push({ address: p, role: "payment" });
    else out[0]!.role = "single";
  }
  if (input.address) out.push({ address: normalizeAddress(input.address), role: "single" });
  return out;
}

export async function runCheckup(targets: Target[]): Promise<Report> {
  if (targets.length === 0) throw new CheckupError("Enter a Bitcoin address to check.", "invalid");
  for (const t of targets) {
    if (!parseAddress(t.address))
      throw new CheckupError(`"${t.address}" is not a valid Bitcoin mainnet address.`, "invalid");
  }
  const [snaps, market] = await Promise.all([Promise.all(targets.map(snapshot)), getMarket()]);
  return buildReport(snaps, market);
}
