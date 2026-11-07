import { ADDRESS_TYPE_LABEL, shortAddress } from "./address";
import { BUSY_FEE_RATE, inputCost, sweepVbytes } from "./fees";
import { formatCount, formatRate, formatSats, outpoint } from "./format";
import type {
  AddressSnapshot,
  ClassifiedCoin,
  CoinKind,
  Consolidation,
  Finding,
  MarketData,
  Report,
  Severity,
} from "./types";

/** Inscriptions are usually sent on 330, 546 or 10,000 sat "postage". Above this, extra sats ride along. */
export const POSTAGE_CEILING = 10_000;
/** Coin counts at which consolidation is worth mentioning. */
export const FRAGMENTED_AT = 10;
/** Transaction counts at which address reuse is worth mentioning. */
export const REUSE_AT = 20;
/** Values that are almost always inscription postage. Used only when no indexer is available. */
const POSTAGE_VALUES = new Set([294, 330, 546, 600, 1000, 10_000]);

const SEVERITY_PENALTY: Record<Severity, number> = { high: 30, medium: 15, low: 6, info: 0 };
const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2, info: 3 };

export function classifyCoin(
  coin: AddressSnapshot["coins"][number],
  snap: AddressSnapshot,
  economyRate: number,
): ClassifiedCoin {
  const spendCost = inputCost(snap.type, economyRate);
  let kind: CoinKind;
  const hasIns = coin.inscriptions.length > 0;
  const hasRunes = coin.runes.length > 0;
  if (hasIns && hasRunes) kind = "mixed";
  else if (hasIns) kind = "inscribed";
  else if (hasRunes) kind = "runic";
  else if (!snap.indexed && POSTAGE_VALUES.has(coin.value)) kind = "unverified";
  else if (spendCost >= coin.value) kind = "uneconomical";
  else kind = "clean";
  return { ...coin, address: snap.address, role: snap.role, kind, spendCost };
}

export function isProtected(kind: CoinKind): boolean {
  return kind === "inscribed" || kind === "runic" || kind === "mixed" || kind === "unverified";
}

export function gradeFor(score: number): Report["grade"] {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function ops(coins: ClassifiedCoin[]): string[] {
  return coins.map(outpoint);
}

function where(snap: AddressSnapshot): string {
  if (snap.role === "payment") return "your payment address";
  if (snap.role === "ordinals") return "your Ordinals address";
  return "this address";
}

export function findingsFor(snap: AddressSnapshot, coins: ClassifiedCoin[], market: MarketData): Finding[] {
  const out: Finding[] = [];
  const mine = coins.filter((c) => c.address === snap.address);
  const inscribed = mine.filter((c) => c.kind === "inscribed" || c.kind === "mixed");
  const runic = mine.filter((c) => c.kind === "runic" || c.kind === "mixed");
  const loc = where(snap);
  const label = shortAddress(snap.address);

  // 1. Inscriptions or runes where a wallet treats coins as spending money.
  const isPaymentLike = snap.role === "payment" || (snap.role === "single" && snap.type !== "p2tr");
  if (inscribed.length > 0 && isPaymentLike) {
    const n = inscribed.reduce((s, c) => s + c.inscriptions.length, 0);
    out.push({
      id: "inscriptions-in-payment",
      severity: snap.role === "payment" ? "high" : "medium",
      title: `${formatCount(n, "inscription")} in ${loc}`,
      detail:
        snap.role === "payment"
          ? "Your wallet uses this address to pay for things. When it picks coins for a payment or a fee, it can pick these and the inscriptions are gone for good."
          : `${ADDRESS_TYPE_LABEL[snap.type]} addresses are normally used for spending, so many wallets will happily use these coins to pay fees.`,
      action:
        "Move them to a Taproot (bc1p) Ordinals address with an Ordinals-aware wallet before you send any bitcoin from here.",
      address: snap.address,
      coins: ops(inscribed),
    });
  }
  if (runic.length > 0 && isPaymentLike) {
    out.push({
      id: "runes-in-payment",
      severity: snap.role === "payment" ? "high" : "medium",
      title: `Runes sitting in ${loc}`,
      detail:
        "A wallet that doesn't understand Runes can spend these coins as plain bitcoin and burn the tokens on them.",
      action: "Send the Runes to your Ordinals address using a Runes-aware wallet.",
      address: snap.address,
      coins: ops(runic),
    });
  }

  // 2. Inscriptions carrying much more bitcoin than postage.
  const heavy = inscribed.filter((c) => c.value > POSTAGE_CEILING);
  if (heavy.length > 0) {
    const extra = heavy.reduce((s, c) => s + c.value - 546, 0);
    out.push({
      id: "heavy-inscriptions",
      severity: "medium",
      title: `About ${formatSats(extra)} locked up with inscriptions`,
      detail: `${heavy.length === 1 ? "1 coin holds" : `${heavy.length} coins hold`} an inscription and far more bitcoin than it needs. Send the inscription and all of those sats go with it; most wallets also refuse to spend them, so they don't count as spendable.`,
      action: 'Use an Ordinals wallet that can split off the extra sats (often called "extract" or "split UTXO").',
      address: snap.address,
      coins: ops(heavy),
    });
  }

  // 3. Several inscriptions stuck together.
  const multi = inscribed.filter((c) => c.inscriptions.length > 1);
  if (multi.length > 0) {
    out.push({
      id: "stacked-inscriptions",
      severity: "low",
      title: `${formatCount(multi.length, "coin")} with several inscriptions on it`,
      detail: "Inscriptions on the same coin move together. You can't sell or send one of them without the others.",
      action: "If you plan to trade them separately, split them with an Ordinals wallet first.",
      address: snap.address,
      coins: ops(multi),
    });
  }

  // 4. Inscriptions and runes on the same coin.
  const mixed = mine.filter((c) => c.kind === "mixed");
  if (mixed.length > 0) {
    out.push({
      id: "mixed-assets",
      severity: "medium",
      title: `${formatCount(mixed.length, "coin")} holding both an inscription and Runes`,
      detail: "A transfer that handles only one of the two can lose the other.",
      action: "Separate them before you trade either one.",
      address: snap.address,
      coins: ops(mixed),
    });
  }

  // 5. Coins that cost more to spend than they hold.
  const dust = mine.filter((c) => c.kind === "uneconomical");
  if (dust.length > 0) {
    const total = dust.reduce((s, c) => s + c.value, 0);
    out.push({
      id: "uneconomical",
      severity: dust.length >= 5 ? "medium" : "low",
      title: `${formatCount(dust.length, "coin")} worth less than the fee to spend them`,
      detail: `Together they hold ${formatSats(total)}, but at ${formatRate(market.fees.economy)} each one costs more in fees than it is worth.`,
      action: "Leave them alone unless fees drop further, or sweep them on the quietest day you can find.",
      address: snap.address,
      coins: ops(dust),
    });
  }

  // 6. Legacy addresses cost more to spend from.
  if (snap.type === "p2pkh" || snap.type === "p2sh") {
    out.push({
      id: "legacy-address",
      severity: "low",
      title: `${ADDRESS_TYPE_LABEL[snap.type]} address`,
      detail: `Every coin spent from ${label} uses ${snap.type === "p2pkh" ? "about 2.6×" : "about 1.6×"} the block space of a Taproot coin, so you pay more in fees each time.`,
      action: "When you next move these funds, send them to a Native SegWit (bc1q) or Taproot (bc1p) address.",
      address: snap.address,
    });
  }

  // 7. Address reuse links all activity together.
  if (snap.stats.txCount >= REUSE_AT) {
    out.push({
      id: "address-reuse",
      severity: "info",
      title: `${snap.stats.txCount.toLocaleString("en-US")} transactions on one address`,
      detail: "Anyone who knows this address can see all of that history and your full balance.",
      action: "For privacy, receive to a fresh address each time. Most wallets do this for you.",
      address: snap.address,
    });
  }

  // 8. Unconfirmed coins.
  const pending = mine.filter((c) => !c.confirmed);
  if (pending.length > 0) {
    out.push({
      id: "unconfirmed",
      severity: "info",
      title: `${formatCount(pending.length, "coin")} still waiting for confirmation`,
      detail: "These can still change or disappear until they are in a block.",
      address: snap.address,
      coins: ops(pending),
    });
  }

  // 9. No indexer: be honest about the blind spot.
  if (!snap.indexed) {
    const maybe = mine.filter((c) => c.kind === "unverified");
    out.push({
      id: "not-indexed",
      severity: maybe.length > 0 ? "low" : "info",
      title: "Ordinals and Runes not checked",
      detail:
        maybe.length > 0
          ? `The Ordinals index didn't answer, so Satscope can't tell which coins carry inscriptions or Runes. ${formatCount(maybe.length, "coin")} have the exact sizes inscriptions usually sit on, so they are marked "check first".`
          : "The Ordinals index didn't answer, so this report covers bitcoin only.",
      action: "Check again later before you spend any small coins from this address.",
      address: snap.address,
      coins: ops(maybe),
    });
  }

  if (snap.tooManyCoins) {
    out.push({
      id: "too-many-coins",
      severity: "info",
      title: "Very large address",
      detail:
        "This address has more coins than Satscope reads. It looks like an exchange or service, not a personal wallet.",
      address: snap.address,
    });
  }
  return out;
}

export function consolidationFor(
  coins: ClassifiedCoin[],
  snaps: AddressSnapshot[],
  market: MarketData,
): Consolidation | null {
  const clean = coins.filter((c) => c.kind === "clean");
  if (clean.length < FRAGMENTED_AT) return null;
  const byType = new Map<AddressSnapshot["type"], number>();
  for (const c of clean) {
    const t = snaps.find((s) => s.address === c.address)!.type;
    byType.set(t, (byType.get(t) ?? 0) + 1);
  }
  const outType = snaps.find((s) => s.role === "payment")?.type ?? snaps[0]!.type;
  const vbytes = sweepVbytes(
    [...byType].map(([type, count]) => ({ type, count })),
    outType,
  );
  const rateNow = market.fees.economy;
  const rateBusy = Math.max(BUSY_FEE_RATE, market.fees.fastest);
  return {
    coinCount: clean.length,
    totalSats: clean.reduce((s, c) => s + c.value, 0),
    vbytes,
    rateNow,
    costNow: Math.ceil(vbytes * rateNow),
    rateBusy,
    costBusy: Math.ceil(vbytes * rateBusy),
  };
}

export function buildReport(snaps: AddressSnapshot[], market: MarketData, now = new Date()): Report {
  const coins = snaps.flatMap((s) => s.coins.map((c) => classifyCoin(c, s, market.fees.economy)));
  coins.sort((a, b) => b.value - a.value);

  const findings = snaps.flatMap((s) => findingsFor(s, coins, market));
  const consolidation = consolidationFor(coins, snaps, market);
  if (consolidation) {
    findings.push({
      id: "fragmented",
      severity: "low",
      title: `${formatCount(consolidation.coinCount, "spendable coin")} could be merged`,
      detail: `Spending these coins together takes about ${consolidation.vbytes.toLocaleString("en-US")} vB. That is ${formatSats(consolidation.costNow)} at today's ${formatRate(consolidation.rateNow)}, or ${formatSats(consolidation.costBusy)} on a busy day at ${formatRate(consolidation.rateBusy)}.`,
      action:
        "Merging them while fees are low makes later payments smaller and cheaper. It also links these coins together on-chain, which matters if you care about privacy.",
      coins: coins.filter((c) => c.kind === "clean").map(outpoint),
    });
  }
  findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const penalty = findings.reduce((s, f) => s + SEVERITY_PENALTY[f.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));

  // Addresses too large to list coin by coin still have a balance from their history.
  const unlisted = snaps
    .filter((s) => s.tooManyCoins)
    .reduce((sum, s) => sum + Math.max(0, s.stats.receivedSats - s.stats.sentSats), 0);
  const sats = coins.reduce((s, c) => s + c.value, 0) + unlisted;
  const protectedSats = coins.filter((c) => isProtected(c.kind)).reduce((s, c) => s + c.value, 0);
  const runeIds = new Set(snaps.flatMap((s) => s.runeBalances.map((r) => r.id)));
  for (const c of coins) for (const r of c.runes) runeIds.add(r.id);

  return {
    addresses: snaps,
    coins,
    findings,
    score,
    grade: gradeFor(score),
    scored: !snaps.some((s) => s.tooManyCoins),
    totals: {
      sats,
      coins: coins.length,
      inscriptions: coins.reduce((s, c) => s + c.inscriptions.length, 0),
      runeKinds: runeIds.size,
      spendableSats: sats - protectedSats,
      protectedSats,
    },
    consolidation,
    market,
    indexed: snaps.every((s) => s.indexed),
    generatedAt: now.toISOString(),
  };
}
