import { describe, expect, it } from "vitest";
import { Signer } from "bip322-js";
import { buildProofMessage, decodeProof, encodeProof, parseProofMessage, validateProof } from "@/lib/proof";
import { verifyProof } from "@/lib/verify";

// Published BIP-322 test vector (P2WPKH).
const VECTOR = {
  address: "bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l",
  message: "Hello World",
  signature:
    "AkcwRAIgZRfIY3p7/DoVTty6YZbWS71bc5Vct9p9Fia83eRmw2QCICK/ENGfwLtptFluMGs2KsqoNSk89pO7F29zJLUx9a/sASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViHI=",
};
// The private key from the BIP-322 test vectors, and the Taproot address it controls.
const TEST_KEY = "L3VFeEujGtevx9w18HD1fhRbCH67Az2dpCymeRE1SoPK6XQtaN2k";
const TAPROOT = "bc1ppv609nr0vr25u07u95waq5lucwfm6tde4nydujnu8npg4q75mr5sxq8lt3";

describe("proof messages", () => {
  it("builds and reads a Satscope message", () => {
    const at = new Date("2026-11-06T10:00:00.000Z");
    const msg = buildProofMessage(TAPROOT, "  OTC deal   with @sam  ", at);
    expect(msg).toBe(
      `Satscope ownership proof\nI control this Bitcoin address: ${TAPROOT}\nNote: OTC deal with @sam\nSigned: 2026-11-06T10:00:00.000Z`,
    );
    expect(parseProofMessage(msg)).toEqual({ address: TAPROOT, note: "OTC deal with @sam", signedAt: at });
    expect(parseProofMessage("Hello World")).toBeNull();
  });

  it("leaves the note out when empty and caps its length", () => {
    expect(buildProofMessage(TAPROOT, "", new Date(0))).not.toContain("Note:");
    expect(buildProofMessage(TAPROOT, "x".repeat(500), new Date(0))).toContain(`Note: ${"x".repeat(140)}\n`);
  });

  it("round-trips through a link token, including non-ASCII text", () => {
    const p = { address: TAPROOT, message: "Satscope ownership proof\nNote: سلام 👋", signature: VECTOR.signature };
    const token = encodeProof(p);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeProof(token)).toEqual(p);
  });

  it("rejects broken or oversized tokens", () => {
    expect(decodeProof("")).toBeNull();
    expect(decodeProof("not base64!")).toBeNull();
    expect(decodeProof("eyJ2IjoyfQ")).toBeNull(); // {"v":2}
    expect(validateProof({ address: TAPROOT, message: "x".repeat(1001), signature: "AA==" })).toBeNull();
    expect(validateProof({ address: TAPROOT, message: "hi", signature: "<script>" })).toBeNull();
  });
});

describe("verifyProof", () => {
  it("accepts the BIP-322 test vector", () => {
    expect(verifyProof(VECTOR)).toEqual({ ok: true });
  });

  it("rejects a changed message", () => {
    expect(verifyProof({ ...VECTOR, message: "Hello World!" }).ok).toBe(false);
  });

  it("accepts a Taproot signature over a Satscope message", () => {
    const message = buildProofMessage(TAPROOT, "portfolio check", new Date("2026-11-06T10:00:00Z"));
    const signature = Signer.sign(TEST_KEY, TAPROOT, message).toString();
    expect(verifyProof({ address: TAPROOT, message, signature })).toEqual({ ok: true });
    expect(verifyProof({ address: VECTOR.address, message, signature }).ok).toBe(false);
  });

  it("explains invalid input instead of throwing", () => {
    expect(verifyProof({ ...VECTOR, signature: "AAAA" })).toEqual({ ok: false, reason: expect.any(String) });
    expect(verifyProof({ ...VECTOR, address: "nope" })).toEqual({
      ok: false,
      reason: "That isn't a valid Bitcoin mainnet address.",
    });
  });
});
