import type { AddressType } from "./types";

/**
 * Typical virtual sizes (vB) of one input and one output per script type.
 * Inputs assume a single-key spend (P2WSH assumes 2-of-3 multisig).
 */
export const INPUT_VBYTES: Record<AddressType, number> = {
  p2tr: 57.5,
  p2wpkh: 68,
  p2wsh: 104.5,
  p2sh: 91, // P2SH-P2WPKH, the common nested SegWit wallet
  p2pkh: 148,
};

export const OUTPUT_VBYTES: Record<AddressType, number> = {
  p2tr: 43,
  p2wpkh: 31,
  p2wsh: 43,
  p2sh: 32,
  p2pkh: 34,
};

/** Version, locktime, counts and the SegWit marker. */
export const TX_OVERHEAD_VBYTES = 10.5;

/** "Busy day" fee rate used to show what waiting could cost. */
export const BUSY_FEE_RATE = 20;

/** What it costs to add one coin of this type as an input, in sats. */
export function inputCost(type: AddressType, feeRate: number): number {
  return Math.ceil(INPUT_VBYTES[type] * feeRate);
}

/** Size of a transaction that spends `inputs` and creates one output of `outType`. */
export function sweepVbytes(inputs: { type: AddressType; count: number }[], outType: AddressType): number {
  const ins = inputs.reduce((sum, i) => sum + INPUT_VBYTES[i.type] * i.count, 0);
  return Math.ceil(TX_OVERHEAD_VBYTES + ins + OUTPUT_VBYTES[outType]);
}

/** Bitcoin Core's dust limit: outputs below this are not relayed. */
export const DUST_LIMIT: Record<AddressType, number> = {
  p2tr: 330,
  p2wpkh: 294,
  p2wsh: 330,
  p2sh: 540,
  p2pkh: 546,
};
