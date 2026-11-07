import { parseAddress } from "./address";
import { DUST_LIMIT, INPUT_VBYTES, OUTPUT_VBYTES, TX_OVERHEAD_VBYTES } from "./fees";
import type { AddressType, CoinKind } from "./types";

/**
 * Plans the transactions behind Satscope's one-click fixes. Pure functions, no
 * I/O, so every rule here is unit-tested. src/lib/psbt.ts turns a plan into a
 * PSBT and checks the signed transaction against the plan before broadcast.
 *
 * Safety rules:
 * - Only coins checked against the Ordinals index are ever spent.
 * - Inscribed and rune coins are never used to pay fees.
 * - Each moved coin becomes an output of exactly the same value, in the same
 *   order, at the front of the transaction, so every inscription keeps its
 *   offset (sats are assigned first-in, first-out).
 * - Output 0 goes to the Ordinals address. With no runestone, Runes from all
 *   inputs go to the first non-OP_RETURN output, so they land there too, on a
 *   Runes-only coin when there is one rather than on an inscription.
 * - Every output goes to an address the connected wallet controls.
 */

export interface FixCoin {
  txid: string;
  vout: number;
  value: number;
  address: string;
  kind: CoinKind;
  confirmed: boolean;
  inscriptions: number;
  runes: string[];
}

export interface PlanInput extends FixCoin {
  type: AddressType;
  /** Why this coin is in the transaction. */
  purpose: "move" | "fee" | "merge";
}

export interface PlanOutput {
  address: string;
  value: number;
  purpose: "moved" | "change" | "merged";
}

export interface FixPlan {
  kind: "move" | "merge";
  inputs: PlanInput[];
  outputs: PlanOutput[];
  fee: number;
  feeRate: number;
  vbytes: number;
}

export type PlanResult = { ok: true; plan: FixPlan } | { ok: false; reason: string };

/** Wallets and nodes relay 1 sat/vB everywhere; going lower risks a stuck transaction. */
export const MIN_FEE_RATE = 1;
export const MAX_MOVE_COINS = 20;
export const MAX_MERGE_COINS = 200;
export const MIN_MERGE_COINS = 3;
/** Input types Satscope can build and the main wallets can sign. Legacy needs full parent transactions. */
export const SPENDABLE_TYPES: AddressType[] = ["p2tr", "p2wpkh", "p2sh"];

function vbytesFor(inputs: { type: AddressType }[], outputs: { address: string }[]): number {
  const ins = inputs.reduce((s, i) => s + INPUT_VBYTES[i.type], 0);
  const outs = outputs.reduce((s, o) => s + OUTPUT_VBYTES[parseAddress(o.address)!], 0);
  return Math.ceil(TX_OVERHEAD_VBYTES + ins + outs);
}

export function effectiveRate(rate: number): number {
  return Math.max(MIN_FEE_RATE, Math.ceil(rate * 100) / 100);
}

function withType(c: FixCoin, purpose: PlanInput["purpose"]): PlanInput {
  return { ...c, type: parseAddress(c.address)!, purpose };
}

/** Coins at `address` that carry inscriptions or Runes and could be lost as fees. */
export function atRiskCoins(coins: FixCoin[], address: string): FixCoin[] {
  return coins.filter(
    (c) => c.address === address && c.confirmed && (c.kind === "inscribed" || c.kind === "runic" || c.kind === "mixed"),
  );
}

/** Plain bitcoin at `address` that is safe to spend and worth spending at `rate`. */
export function spendableCoins(coins: FixCoin[], address: string, rate: number): FixCoin[] {
  const type = parseAddress(address);
  if (!type) return [];
  const cost = Math.ceil(INPUT_VBYTES[type] * rate);
  return coins
    .filter((c) => c.address === address && c.confirmed && c.kind === "clean" && c.value > cost)
    .sort((a, b) => b.value - a.value || a.txid.localeCompare(b.txid) || a.vout - b.vout);
}

/**
 * Moves inscriptions and Runes out of a payment address into the wallet's
 * Ordinals address. Fees come from plain bitcoin in the payment address, and
 * change goes back there.
 */
export function planMove(opts: {
  coins: FixCoin[];
  from: string;
  to: string;
  feeRate: number;
  /** Whether `from` was checked against the Ordinals index. */
  indexed: boolean;
}): PlanResult {
  const { coins, from, to, indexed } = opts;
  const feeRate = effectiveRate(opts.feeRate);
  const fromType = parseAddress(from);
  const toType = parseAddress(to);
  if (!fromType || !toType) return { ok: false, reason: "One of the addresses isn't a valid Bitcoin address." };
  if (from === to) return { ok: false, reason: "The payment and Ordinals addresses are the same in this wallet." };
  if (toType !== "p2tr") return { ok: false, reason: "The wallet's Ordinals address isn't a Taproot address." };
  if (!SPENDABLE_TYPES.includes(fromType)) {
    return { ok: false, reason: "Satscope can't build transactions from legacy (1…) addresses yet." };
  }
  if (!indexed) return { ok: false, reason: "The Ordinals index didn't answer, so it isn't safe to move coins now." };

  const risky = atRiskCoins(coins, from);
  if (risky.length === 0) return { ok: false, reason: "There are no inscriptions or Runes to move." };
  // With no runestone, every Rune in the transaction lands on output 0. Put a
  // Runes-only coin there when there is one, so Runes never pile onto an inscription.
  const order = { runic: 0, mixed: 1, inscribed: 2 } as Record<string, number>;
  const movable = risky
    .filter((c) => c.value >= DUST_LIMIT[toType])
    .sort((a, b) => (order[a.kind] ?? 3) - (order[b.kind] ?? 3))
    .slice(0, MAX_MOVE_COINS);
  if (movable.length === 0) {
    return {
      ok: false,
      reason: "These coins are smaller than a Taproot output can be, so move them from your wallet.",
    };
  }

  const moveInputs = movable.map((c) => withType(c, "move"));
  const moveOutputs: PlanOutput[] = movable.map((c) => ({ address: to, value: c.value, purpose: "moved" }));
  const feeCoins = spendableCoins(coins, from, feeRate);
  const feeInputs: PlanInput[] = [];
  const dust = DUST_LIMIT[fromType];

  for (const coin of [null, ...feeCoins]) {
    if (coin) feeInputs.push(withType(coin, "fee"));
    const inputs = [...moveInputs, ...feeInputs];
    const available = feeInputs.reduce((s, i) => s + i.value, 0);
    const withChange = [...moveOutputs, { address: from, value: 0, purpose: "change" as const }];
    const feeWithChange = Math.ceil(vbytesFor(inputs, withChange) * feeRate);
    const change = available - feeWithChange;
    if (change >= dust) {
      return {
        ok: true,
        plan: finish("move", inputs, [...moveOutputs, { address: from, value: change, purpose: "change" }], feeRate),
      };
    }
    const feeNoChange = Math.ceil(vbytesFor(inputs, moveOutputs) * feeRate);
    // Without change, everything left over goes to the miner; allow that only for small leftovers.
    if (available >= feeNoChange && available - feeNoChange < dust) {
      return { ok: true, plan: finish("move", inputs, moveOutputs, feeRate) };
    }
  }
  const need = Math.ceil(vbytesFor([...moveInputs, ...feeInputs.slice(0, 1)], moveOutputs) * feeRate);
  return {
    ok: false,
    reason: `The payment address needs about ${need.toLocaleString("en-US")} sats of plain bitcoin to pay the fee. Add some and check again.`,
  };
}

/** Merges plain bitcoin coins in one address into a single coin at the same address. */
export function planMerge(opts: { coins: FixCoin[]; address: string; feeRate: number; indexed: boolean }): PlanResult {
  const { coins, address, indexed } = opts;
  const feeRate = effectiveRate(opts.feeRate);
  const type = parseAddress(address);
  if (!type) return { ok: false, reason: "That isn't a valid Bitcoin address." };
  if (!SPENDABLE_TYPES.includes(type)) {
    return { ok: false, reason: "Satscope can't build transactions from legacy (1…) addresses yet." };
  }
  if (!indexed) return { ok: false, reason: "The Ordinals index didn't answer, so it isn't safe to merge coins now." };

  const picked = spendableCoins(coins, address, feeRate).slice(0, MAX_MERGE_COINS);
  if (picked.length < MIN_MERGE_COINS) {
    return { ok: false, reason: `There are fewer than ${MIN_MERGE_COINS} plain bitcoin coins worth merging.` };
  }
  const inputs = picked.map((c) => withType(c, "merge"));
  const total = inputs.reduce((s, i) => s + i.value, 0);
  const fee = Math.ceil(vbytesFor(inputs, [{ address }]) * feeRate);
  const value = total - fee;
  if (value < DUST_LIMIT[type]) return { ok: false, reason: "These coins are worth less than the fee to merge them." };
  return { ok: true, plan: finish("merge", inputs, [{ address, value, purpose: "merged" }], feeRate) };
}

function finish(kind: FixPlan["kind"], inputs: PlanInput[], outputs: PlanOutput[], feeRate: number): FixPlan {
  const fee = inputs.reduce((s, i) => s + i.value, 0) - outputs.reduce((s, o) => s + o.value, 0);
  return { kind, inputs, outputs, fee, feeRate, vbytes: vbytesFor(inputs, outputs) };
}
