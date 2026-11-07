export type AddressType = "p2tr" | "p2wpkh" | "p2wsh" | "p2sh" | "p2pkh";

/** Which job an address does in a connected wallet. "single" = looked up on its own. */
export type AddressRole = "ordinals" | "payment" | "single";

export interface RuneAmount {
  id: string;
  name: string;
  /** Raw integer amount as a string (runes can exceed Number.MAX_SAFE_INTEGER). */
  amount: string;
  divisibility: number;
  symbol: string;
}

export interface InscriptionRef {
  id: string;
  /** Inscription number, when the indexer reports it. */
  number?: number;
}

export interface Coin {
  txid: string;
  vout: number;
  /** Value in sats. */
  value: number;
  confirmed: boolean;
  height?: number;
  /** Block time, unix seconds. */
  time?: number;
  inscriptions: InscriptionRef[];
  runes: RuneAmount[];
}

export interface AddressStats {
  txCount: number;
  receivedSats: number;
  sentSats: number;
  pendingTxCount: number;
}

export interface RuneBalance extends RuneAmount {}

export interface AddressSnapshot {
  address: string;
  type: AddressType;
  role: AddressRole;
  stats: AddressStats;
  coins: Coin[];
  /** True when inscriptions and runes were checked against an indexer. */
  indexed: boolean;
  runeBalances: RuneBalance[];
  /** Set when the address has more coins than Satscope reads. */
  tooManyCoins?: boolean;
}

export interface FeeRates {
  /** sat/vB */
  fastest: number;
  halfHour: number;
  hour: number;
  economy: number;
  minimum: number;
}

export interface MarketData {
  fees: FeeRates;
  /** USD per BTC, or null when no price source answered. */
  usd: number | null;
  tipHeight: number | null;
}

export type CoinKind = "inscribed" | "runic" | "mixed" | "uneconomical" | "clean" | "unverified";

export type Severity = "high" | "medium" | "low" | "info";

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  /** Plain next step for the reader. */
  action?: string;
  address?: string;
  /** Outpoints (txid:vout) the finding is about. */
  coins?: string[];
}

export interface ClassifiedCoin extends Coin {
  address: string;
  role: AddressRole;
  kind: CoinKind;
  /** What spending this coin alone would cost at the economy rate, in sats. */
  spendCost: number;
}

export interface Consolidation {
  coinCount: number;
  totalSats: number;
  vbytes: number;
  costNow: number;
  rateNow: number;
  /** What spending the same coins would cost on a busy day. */
  costBusy: number;
  rateBusy: number;
}

export interface Report {
  addresses: AddressSnapshot[];
  coins: ClassifiedCoin[];
  findings: Finding[];
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  /** False when an address had too many coins to read; the score then means nothing. */
  scored: boolean;
  totals: {
    sats: number;
    coins: number;
    inscriptions: number;
    runeKinds: number;
    spendableSats: number;
    protectedSats: number;
  };
  consolidation: Consolidation | null;
  market: MarketData;
  indexed: boolean;
  generatedAt: string;
}
