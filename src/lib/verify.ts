import "server-only";
import { Verifier } from "bip322-js";
import { parseAddress } from "./address";
import type { Proof } from "./proof";

export type VerifyResult = { ok: true } | { ok: false; reason: string };

/**
 * Checks a message signature. Accepts BIP-322 signatures (Taproot, Native and
 * Nested SegWit) and legacy "Bitcoin Signed Message" signatures (BIP-137),
 * which is what Electrum, Sparrow and Bitcoin Core produce.
 */
export function verifyProof(p: Proof): VerifyResult {
  const type = parseAddress(p.address);
  if (!type) return { ok: false, reason: "That isn't a valid Bitcoin mainnet address." };
  if (type === "p2wsh") return { ok: false, reason: "Multisig (P2WSH) message signatures aren't supported." };
  try {
    return Verifier.verifySignature(p.address, p.message, p.signature)
      ? { ok: true }
      : { ok: false, reason: "The signature doesn't match this address and message." };
  } catch {
    return { ok: false, reason: "The signature couldn't be read. Check that it was copied in full." };
  }
}
