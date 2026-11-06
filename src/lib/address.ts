import { sha256 } from "@noble/hashes/sha2.js";
import type { AddressType } from "./types";

/**
 * Bitcoin mainnet address parsing that is safe to run in the browser.
 * Checks bech32/bech32m checksums and base58check, then names the script type.
 */

const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const BECH32_CONST = 1;
const BECH32M_CONST = 0x2bc830a3;

function polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= GEN[i]!;
  }
  return chk >>> 0;
}

function hrpExpand(hrp: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) >> 5);
  out.push(0);
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) & 31);
  return out;
}

function convertBits(data: number[], from: number, to: number): number[] | null {
  let acc = 0;
  let bits = 0;
  const out: number[] = [];
  const maxv = (1 << to) - 1;
  for (const value of data) {
    if (value < 0 || value >> from) return null;
    acc = (acc << from) | value;
    bits += from;
    while (bits >= to) {
      bits -= to;
      out.push((acc >> bits) & maxv);
    }
  }
  if (bits >= from || (acc << (to - bits)) & maxv) return null;
  return out;
}

function decodeSegwit(addr: string): { version: number; program: number[] } | null {
  if (addr.length < 14 || addr.length > 90) return null;
  const lower = addr.toLowerCase();
  if (addr !== lower && addr !== addr.toUpperCase()) return null;
  const pos = lower.lastIndexOf("1");
  if (pos < 1 || pos + 7 > lower.length) return null;
  const hrp = lower.slice(0, pos);
  if (hrp !== "bc") return null;
  const data: number[] = [];
  for (const c of lower.slice(pos + 1)) {
    const d = BECH32_CHARSET.indexOf(c);
    if (d === -1) return null;
    data.push(d);
  }
  const check = polymod([...hrpExpand(hrp), ...data]);
  const version = data[0];
  if (version === undefined || version > 16) return null;
  const expected = version === 0 ? BECH32_CONST : BECH32M_CONST;
  if (check !== expected) return null;
  const program = convertBits(data.slice(1, -6), 5, 8);
  if (!program || program.length < 2 || program.length > 40) return null;
  if (version === 0 && program.length !== 20 && program.length !== 32) return null;
  return { version, program };
}

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Decode(s: string): Uint8Array | null {
  let num = 0n;
  for (const c of s) {
    const i = BASE58.indexOf(c);
    if (i === -1) return null;
    num = num * 58n + BigInt(i);
  }
  const bytes: number[] = [];
  while (num > 0n) {
    bytes.unshift(Number(num % 256n));
    num /= 256n;
  }
  for (const c of s) {
    if (c !== "1") break;
    bytes.unshift(0);
  }
  return Uint8Array.from(bytes);
}

function decodeBase58Check(addr: string): number | null {
  if (addr.length < 26 || addr.length > 35) return null;
  const bytes = base58Decode(addr);
  if (!bytes || bytes.length !== 25) return null;
  const payload = bytes.slice(0, 21);
  const checksum = sha256(sha256(payload)).slice(0, 4);
  for (let i = 0; i < 4; i++) if (checksum[i] !== bytes[21 + i]) return null;
  return payload[0]!;
}

/** Returns the script type of a valid mainnet address, or null if the address is invalid. */
export function parseAddress(input: string): AddressType | null {
  const addr = input.trim();
  if (!addr) return null;
  if (/^bc1/i.test(addr)) {
    const seg = decodeSegwit(addr);
    if (!seg) return null;
    if (seg.version === 0) return seg.program.length === 20 ? "p2wpkh" : "p2wsh";
    if (seg.version === 1 && seg.program.length === 32) return "p2tr";
    return null;
  }
  const version = decodeBase58Check(addr);
  if (version === 0x00) return "p2pkh";
  if (version === 0x05) return "p2sh";
  return null;
}

/** Bech32 addresses are case-insensitive; store them lowercase so cache keys and links match. */
export function normalizeAddress(input: string): string {
  const addr = input.trim();
  return /^bc1/i.test(addr) ? addr.toLowerCase() : addr;
}

export function looksLikeTestnet(input: string): boolean {
  return /^(tb1|bcrt1|[mn2][a-km-zA-HJ-NP-Z1-9]{25,34}$)/.test(input.trim());
}

export const ADDRESS_TYPE_LABEL: Record<AddressType, string> = {
  p2tr: "Taproot",
  p2wpkh: "Native SegWit",
  p2wsh: "SegWit script",
  p2sh: "Nested SegWit / P2SH",
  p2pkh: "Legacy",
};

export function shortAddress(addr: string, keep = 6): string {
  return addr.length <= keep * 2 + 1 ? addr : `${addr.slice(0, keep)}…${addr.slice(-keep)}`;
}
