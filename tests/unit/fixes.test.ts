import ecc from "@bitcoinerlab/secp256k1";
import { crypto, networks, payments, Psbt, toXOnly } from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import { describe, expect, it } from "vitest";
import { atRiskCoins, planMerge, planMove, spendableCoins, type FixCoin, type FixPlan } from "@/lib/fix";
import { buildPsbt, checkSigned } from "@/lib/psbt";

const ECPair = ECPairFactory(ecc);
// The private key from the BIP-322 test vectors. Never holds real funds.
const key = ECPair.fromWIF("L3VFeEujGtevx9w18HD1fhRbCH67Az2dpCymeRE1SoPK6XQtaN2k");
const pubHex = Buffer.from(key.publicKey).toString("hex");
const PAY = payments.p2wpkh({ pubkey: key.publicKey, network: networks.bitcoin }).address!;
const NESTED = payments.p2sh({ redeem: payments.p2wpkh({ pubkey: key.publicKey }) }).address!;
const ORD = payments.p2tr({ internalPubkey: toXOnly(key.publicKey) }).address!;
const KEYS = { [PAY]: pubHex, [NESTED]: pubHex, [ORD]: pubHex };

function txid(n: number): string {
  return n.toString(16).padStart(64, "a");
}

function coin(n: number, address: string, value: number, kind: FixCoin["kind"], extra: Partial<FixCoin> = {}): FixCoin {
  return { txid: txid(n), vout: n % 3, value, address, kind, confirmed: true, inscriptions: 0, runes: [], ...extra };
}

/** Signs like a wallet would: key-path for Taproot, ECDSA for SegWit. */
function sign(plan: FixPlan): string {
  const psbt = buildPsbt(plan, KEYS);
  const tweaked = key.tweak(crypto.taggedHash("TapTweak", toXOnly(key.publicKey)));
  plan.inputs.forEach((i, idx) => psbt.signInput(idx, i.type === "p2tr" ? tweaked : key));
  psbt.finalizeAllInputs();
  return psbt.toHex();
}

describe("addresses from the test key", () => {
  it("match the BIP-322 vectors", () => {
    expect(PAY).toBe("bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l");
    expect(ORD).toBe("bc1ppv609nr0vr25u07u95waq5lucwfm6tde4nydujnu8npg4q75mr5sxq8lt3");
    expect(NESTED.startsWith("3")).toBe(true);
  });
});

describe("planMove", () => {
  const coins = [
    coin(1, PAY, 546, "inscribed", { inscriptions: 1 }),
    coin(2, PAY, 10_000, "mixed", { inscriptions: 2, runes: ["DOG•GO•TO•THE•MOON"] }),
    coin(3, PAY, 546, "runic", { runes: ["RSIC•GENESIS•RUNE"] }),
    coin(4, PAY, 25_000, "clean"),
    coin(5, PAY, 8_000, "clean"),
    coin(6, PAY, 600, "unverified"),
    coin(7, PAY, 300_000, "clean", { confirmed: false }),
    coin(8, ORD, 546, "inscribed", { inscriptions: 1 }),
  ];

  it("moves every at-risk coin whole, in order, to the Ordinals address", () => {
    const r = planMove({ coins, from: PAY, to: ORD, feeRate: 2, indexed: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const { plan } = r;
    expect(plan.inputs.map((i) => i.purpose)).toEqual(["move", "move", "move", "fee"]);
    // Each moved coin becomes an output of the same value at the same position.
    expect(plan.outputs.slice(0, 3)).toEqual(
      plan.inputs.slice(0, 3).map((i) => ({ address: ORD, value: i.value, purpose: "moved" })),
    );
    // Output 0 is the Ordinals address, so Runes (no runestone) land there.
    expect(plan.outputs[0]!.address).toBe(ORD);
    // Fees come from the largest plain coin; change returns to the payment address.
    expect(plan.inputs[3]!.value).toBe(25_000);
    expect(plan.outputs[3]).toMatchObject({ address: PAY, purpose: "change" });
    expect(plan.fee).toBe(Math.ceil(plan.vbytes * 2));
    // Never spends unverified, unconfirmed, or Ordinals-address coins.
    const used = plan.inputs.map((i) => i.txid);
    expect(used).not.toContain(txid(6));
    expect(used).not.toContain(txid(7));
    expect(used).not.toContain(txid(8));
  });

  it("puts a Runes-only coin first so Runes don't land on an inscription", () => {
    const r = planMove({ coins, from: PAY, to: ORD, feeRate: 2, indexed: true });
    if (!r.ok) throw new Error(r.reason);
    expect(r.plan.inputs.slice(0, 3).map((i) => i.kind)).toEqual(["runic", "mixed", "inscribed"]);
  });

  it("produces a transaction a wallet can sign that matches the plan", () => {
    const r = planMove({ coins, from: PAY, to: ORD, feeRate: 3.3, indexed: true });
    if (!r.ok) throw new Error(r.reason);
    const checked = checkSigned(r.plan, sign(r.plan));
    expect(checked.vsize).toBeLessThanOrEqual(r.plan.vbytes);
    expect(checked.fee / checked.vsize).toBeGreaterThanOrEqual(3.3);
    expect(checked.txid).toMatch(/^[0-9a-f]{64}$/);
  });

  it("works from a nested SegWit (3…) payment address", () => {
    const nested = [coin(1, NESTED, 546, "inscribed", { inscriptions: 1 }), coin(2, NESTED, 50_000, "clean")];
    const r = planMove({ coins: nested, from: NESTED, to: ORD, feeRate: 5, indexed: true });
    if (!r.ok) throw new Error(r.reason);
    const checked = checkSigned(r.plan, sign(r.plan));
    expect(checked.vsize).toBeLessThanOrEqual(r.plan.vbytes);
    expect(checked.fee / checked.vsize).toBeGreaterThanOrEqual(5);
  });

  it("drops change below dust into the fee instead of creating dust", () => {
    const tight = [coin(1, PAY, 546, "inscribed", { inscriptions: 1 }), coin(2, PAY, 300, "clean")];
    const r = planMove({ coins: tight, from: PAY, to: ORD, feeRate: 1, indexed: true });
    if (!r.ok) throw new Error(r.reason);
    expect(r.plan.outputs).toHaveLength(1);
    expect(r.plan.fee).toBe(300); // the whole fee coin, since 110 sats of change would be dust
    expect(r.plan.fee).toBeGreaterThanOrEqual(r.plan.vbytes);
  });

  it("explains what's missing instead of building a bad transaction", () => {
    const noFee = coins.filter((c) => c.kind !== "clean");
    expect(planMove({ coins: noFee, from: PAY, to: ORD, feeRate: 2, indexed: true })).toMatchObject({
      ok: false,
      reason: expect.stringContaining("plain bitcoin to pay the fee"),
    });
    expect(planMove({ coins, from: PAY, to: ORD, feeRate: 2, indexed: false }).ok).toBe(false);
    expect(planMove({ coins, from: PAY, to: PAY, feeRate: 2, indexed: true }).ok).toBe(false);
    const legacy = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
    expect(planMove({ coins, from: legacy, to: ORD, feeRate: 2, indexed: true })).toMatchObject({
      ok: false,
      reason: expect.stringContaining("legacy"),
    });
    expect(planMove({ coins: [], from: PAY, to: ORD, feeRate: 2, indexed: true }).ok).toBe(false);
  });

  it("never goes below 1 sat/vB", () => {
    const r = planMove({ coins, from: PAY, to: ORD, feeRate: 0.11, indexed: true });
    if (!r.ok) throw new Error(r.reason);
    expect(r.plan.feeRate).toBe(1);
  });
});

describe("planMerge", () => {
  const coins = [
    ...[48_000, 31_250, 22_100, 15_000, 9_900, 120].map((v, i) => coin(10 + i, PAY, v, "clean")),
    coin(30, PAY, 546, "inscribed", { inscriptions: 1 }),
    coin(31, PAY, 546, "unverified"),
  ];

  it("merges only plain coins worth spending into one coin at the same address", () => {
    const r = planMerge({ coins, address: PAY, feeRate: 2, indexed: true });
    if (!r.ok) throw new Error(r.reason);
    expect(r.plan.inputs).toHaveLength(5); // the 120-sat coin costs more than it holds at 2 sat/vB
    expect(r.plan.inputs.every((i) => i.kind === "clean")).toBe(true);
    expect(r.plan.outputs).toHaveLength(1);
    expect(r.plan.outputs[0]).toMatchObject({ address: PAY, purpose: "merged" });
    expect(r.plan.outputs[0]!.value).toBe(48_000 + 31_250 + 22_100 + 15_000 + 9_900 - r.plan.fee);
    const checked = checkSigned(r.plan, sign(r.plan));
    expect(checked.vsize).toBeLessThanOrEqual(r.plan.vbytes);
    expect(checked.fee / checked.vsize).toBeGreaterThanOrEqual(2);
  });

  it("merges Taproot coins with a key-path spend", () => {
    const tr = [30_000, 20_000, 10_000].map((v, i) => coin(40 + i, ORD, v, "clean"));
    const r = planMerge({ coins: tr, address: ORD, feeRate: 4, indexed: true });
    if (!r.ok) throw new Error(r.reason);
    const checked = checkSigned(r.plan, sign(r.plan));
    expect(checked.vsize).toBeLessThanOrEqual(r.plan.vbytes);
    expect(checked.fee / checked.vsize).toBeGreaterThanOrEqual(4);
  });

  it("needs at least three coins and an index answer", () => {
    expect(planMerge({ coins: coins.slice(0, 2), address: PAY, feeRate: 2, indexed: true }).ok).toBe(false);
    expect(planMerge({ coins, address: PAY, feeRate: 2, indexed: false }).ok).toBe(false);
  });
});

describe("checkSigned", () => {
  const coins = [coin(1, PAY, 546, "inscribed", { inscriptions: 1 }), coin(2, PAY, 50_000, "clean")];
  const r = planMove({ coins, from: PAY, to: ORD, feeRate: 2, indexed: true });
  if (!r.ok) throw new Error(r.reason);
  const plan = r.plan;

  it("rejects a wallet that changed an output", () => {
    const psbt = buildPsbt(plan, KEYS);
    // Rebuild with the change sent elsewhere, as a malicious or buggy wallet might.
    const evil = new Psbt();
    evil.addInputs(psbt.txInputs.map((inp, i) => ({ ...inp, witnessUtxo: psbt.data.inputs[i]!.witnessUtxo })));
    evil.addOutput({ address: ORD, value: BigInt(546) });
    evil.addOutput({
      address: "bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3",
      value: BigInt(plan.outputs[1]!.value),
    });
    evil.signAllInputs(key);
    evil.finalizeAllInputs();
    expect(() => checkSigned(plan, evil.toHex())).toThrow(/different outputs/);
  });

  it("rejects signatures that would let others change the outputs", () => {
    const psbt = buildPsbt(plan, KEYS);
    const SIGHASH_NONE_ANYONECANPAY = 0x82;
    plan.inputs.forEach((_, i) => {
      psbt.updateInput(i, { sighashType: SIGHASH_NONE_ANYONECANPAY });
      psbt.signInput(i, key, [SIGHASH_NONE_ANYONECANPAY]);
    });
    psbt.finalizeAllInputs();
    expect(() => checkSigned(plan, psbt.toHex())).toThrow(/unusual signature type/);
  });

  it("rejects a PSBT the wallet didn't sign", () => {
    expect(() => checkSigned(plan, buildPsbt(plan, KEYS).toHex())).toThrow(/didn't sign input 1/);
  });

  it("accepts base64 and a raw signed transaction", () => {
    const hex = sign(plan);
    const b64 = Buffer.from(hex, "hex").toString("base64");
    const a = checkSigned(plan, b64);
    const b = checkSigned(plan, a.txHex);
    expect(b.txid).toBe(a.txid);
  });

  it("refuses a key that doesn't belong to the address", () => {
    const other = ECPair.makeRandom();
    const trPlan = planMerge({
      coins: [1, 2, 3].map((n) => coin(50 + n, ORD, 20_000, "clean")),
      address: ORD,
      feeRate: 2,
      indexed: true,
    });
    if (!trPlan.ok) throw new Error(trPlan.reason);
    expect(() => buildPsbt(trPlan.plan, { [ORD]: Buffer.from(other.publicKey).toString("hex") })).toThrow(
      /doesn't match/,
    );
  });
});

describe("helpers", () => {
  it("finds at-risk and spendable coins", () => {
    const coins = [coin(1, PAY, 546, "inscribed"), coin(2, PAY, 5000, "clean"), coin(3, ORD, 546, "inscribed")];
    expect(atRiskCoins(coins, PAY).map((c) => c.txid)).toEqual([txid(1)]);
    expect(spendableCoins(coins, PAY, 1).map((c) => c.txid)).toEqual([txid(2)]);
  });
});
