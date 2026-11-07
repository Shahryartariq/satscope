import ecc from "@bitcoinerlab/secp256k1";
import { address as baddress, initEccLib, networks, payments, Psbt, Transaction } from "bitcoinjs-lib";
import type { FixPlan } from "./fix";

/**
 * Turns a FixPlan into a PSBT for the wallet to sign, and checks the signed
 * transaction against the plan before it is broadcast. Runs in the browser.
 */

initEccLib(ecc);

const network = networks.bitcoin;
/** Opts in to replace-by-fee, so a stuck transaction can be sped up from the wallet. */
const RBF_SEQUENCE = 0xfffffffd;

export interface WalletKeys {
  /** address → public key hex, as reported by the wallet. */
  [address: string]: string;
}

function hexToBytes(hex: string): Uint8Array {
  if (!/^([0-9a-f]{2})+$/i.test(hex)) throw new Error("The wallet sent a public key that isn't hex.");
  return Uint8Array.from(hex.match(/../g)!.map((b) => parseInt(b, 16)));
}

function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

function xOnly(pub: Uint8Array): Uint8Array {
  return pub.length === 33 ? pub.slice(1) : pub;
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/** Script and spending data for one input, checked against the wallet's key. */
function inputData(address: string, type: string, pubHex: string | undefined) {
  const script = baddress.toOutputScript(address, network);
  if (type === "p2wpkh") return { script };
  if (!pubHex) throw new Error(`The wallet didn't share the public key for ${address}.`);
  const pub = hexToBytes(pubHex);
  if (type === "p2tr") {
    const internal = xOnly(pub);
    const p = payments.p2tr({ internalPubkey: internal, network });
    if (p.address !== address) throw new Error("The wallet's Taproot key doesn't match this address.");
    return { script, tapInternalKey: internal };
  }
  if (type === "p2sh") {
    if (pub.length !== 33) throw new Error("The wallet's key for the nested SegWit address has the wrong length.");
    const redeem = payments.p2wpkh({ pubkey: pub, network });
    const p = payments.p2sh({ redeem, network });
    if (p.address !== address)
      throw new Error("This 3… address isn't a nested SegWit address from the connected wallet.");
    return { script, redeemScript: redeem.output! };
  }
  throw new Error("Satscope can't build transactions from this address type.");
}

export function buildPsbt(plan: FixPlan, keys: WalletKeys): Psbt {
  const psbt = new Psbt({ network });
  for (const i of plan.inputs) {
    const d = inputData(i.address, i.type, keys[i.address]);
    psbt.addInput({
      hash: i.txid,
      index: i.vout,
      sequence: RBF_SEQUENCE,
      witnessUtxo: { script: d.script, value: BigInt(i.value) },
      ...("tapInternalKey" in d ? { tapInternalKey: d.tapInternalKey } : {}),
      ...("redeemScript" in d ? { redeemScript: d.redeemScript } : {}),
    });
  }
  for (const o of plan.outputs) psbt.addOutput({ address: o.address, value: BigInt(o.value) });
  return psbt;
}

export interface SignedCheck {
  txHex: string;
  txid: string;
  vsize: number;
  fee: number;
}

/**
 * Reads what the wallet returned, finalises it if needed, and confirms the
 * transaction spends exactly the planned coins and pays exactly the planned
 * outputs. Throws with a plain explanation otherwise.
 */
export function checkSigned(plan: FixPlan, signed: string): SignedCheck {
  let tx: Transaction;
  const raw = signed.trim();
  if (/^0[12]000000/.test(raw)) {
    tx = Transaction.fromHex(raw);
  } else {
    let psbt: Psbt;
    try {
      psbt = /^[0-9a-f]+$/i.test(raw) ? Psbt.fromHex(raw, { network }) : Psbt.fromBase64(raw, { network });
    } catch {
      throw new Error("The wallet returned something that isn't a signed transaction.");
    }
    for (let i = 0; i < psbt.inputCount; i++) {
      const input = psbt.data.inputs[i]!;
      if (!input.finalScriptWitness && !input.finalScriptSig) {
        try {
          psbt.finalizeInput(i);
        } catch {
          throw new Error(`The wallet didn't sign input ${i + 1}. Approve all inputs and try again.`);
        }
      }
    }
    tx = psbt.extractTransaction(true);
  }

  if (tx.ins.length !== plan.inputs.length)
    throw new Error("The signed transaction spends different coins than planned.");
  tx.ins.forEach((inp, i) => {
    const want = plan.inputs[i]!;
    const txid = bytesToHex(Uint8Array.from(inp.hash).reverse());
    if (txid !== want.txid || inp.index !== want.vout) {
      throw new Error("The signed transaction spends different coins than planned.");
    }
  });
  if (tx.outs.length !== plan.outputs.length)
    throw new Error("The signed transaction has different outputs than planned.");
  tx.outs.forEach((out, i) => {
    const want = plan.outputs[i]!;
    const script = baddress.toOutputScript(want.address, network);
    if (!sameBytes(out.script, script) || out.value !== BigInt(want.value)) {
      throw new Error("The signed transaction pays different outputs than planned. Nothing was sent.");
    }
  });
  const fee = plan.inputs.reduce((s, i) => s + i.value, 0) - plan.outputs.reduce((s, o) => s + o.value, 0);
  return { txHex: tx.toHex(), txid: tx.getId(), vsize: tx.virtualSize(), fee };
}

/** Sends a signed transaction to mempool.space, with blockstream.info as backup. Returns the txid. */
export async function broadcast(txHex: string): Promise<string> {
  let lastError = "";
  for (const base of ["https://mempool.space/api", "https://blockstream.info/api"]) {
    try {
      const res = await fetch(`${base}/tx`, { method: "POST", body: txHex, headers: { "Content-Type": "text/plain" } });
      const text = (await res.text()).trim();
      if (res.ok && /^[0-9a-f]{64}$/.test(text)) return text;
      lastError = text.slice(0, 200);
      // A rejection from the node (bad fee, already spent) won't change on the backup server.
      if (res.status === 400) break;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`The network rejected the transaction: ${lastError || "no answer"}`);
}
