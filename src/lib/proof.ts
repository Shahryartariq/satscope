/**
 * Ownership proofs: a message signed by a Bitcoin address, packed into a link.
 * Nothing is stored; the link carries the address, message and signature,
 * and the verify page checks the signature again every time it opens.
 */

export interface Proof {
  address: string;
  message: string;
  signature: string;
}

export const MAX_NOTE = 140;
const MAX_MESSAGE = 1000;
const MAX_SIGNATURE = 800;

export function buildProofMessage(address: string, note: string, signedAt: Date): string {
  const lines = ["Satscope ownership proof", `I control this Bitcoin address: ${address}`];
  const clean = note.replace(/\s+/g, " ").trim().slice(0, MAX_NOTE);
  if (clean) lines.push(`Note: ${clean}`);
  lines.push(`Signed: ${signedAt.toISOString()}`);
  return lines.join("\n");
}

/** Reads the parts of a Satscope proof message; returns null for any other message. */
export function parseProofMessage(message: string): { address: string; note?: string; signedAt?: Date } | null {
  const lines = message.split("\n");
  if (lines[0] !== "Satscope ownership proof") return null;
  const addr = lines[1]?.match(/^I control this Bitcoin address: (\S+)$/)?.[1];
  if (!addr) return null;
  const note = lines.find((l) => l.startsWith("Note: "))?.slice(6);
  const signed = lines.find((l) => l.startsWith("Signed: "))?.slice(8);
  const signedAt = signed ? new Date(signed) : undefined;
  return { address: addr, note, signedAt: signedAt && !Number.isNaN(signedAt.getTime()) ? signedAt : undefined };
}

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeProof(p: Proof): string {
  return toBase64Url(JSON.stringify({ v: 1, a: p.address, m: p.message, s: p.signature }));
}

export function decodeProof(token: string): Proof | null {
  if (!token || token.length > 4000 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
  try {
    const raw = JSON.parse(fromBase64Url(token)) as { v?: number; a?: unknown; m?: unknown; s?: unknown };
    if (raw.v !== 1 || typeof raw.a !== "string" || typeof raw.m !== "string" || typeof raw.s !== "string") return null;
    return validateProof({ address: raw.a, message: raw.m, signature: raw.s });
  } catch {
    return null;
  }
}

export function validateProof(p: Proof): Proof | null {
  const address = p.address.trim();
  const message = p.message.replace(/\r\n/g, "\n");
  const signature = p.signature.trim();
  if (!address || address.length > 100) return null;
  if (!message || message.length > MAX_MESSAGE) return null;
  if (!signature || signature.length > MAX_SIGNATURE || !/^[A-Za-z0-9+/=]+$/.test(signature)) return null;
  return { address, message, signature };
}
