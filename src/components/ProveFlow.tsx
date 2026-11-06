"use client";

import { useState } from "react";
import { ADDRESS_TYPE_LABEL, parseAddress, shortAddress } from "@/lib/address";
import { buildProofMessage, encodeProof, MAX_NOTE } from "@/lib/proof";
import { CopyButton } from "./CopyButton";
import { disconnectWallet, signWithWallet, walletErrorMessage, type Connected } from "./wallet/laserEyes";
import { WalletDialog } from "./wallet/WalletDialog";

export function ProveFlow() {
  const [open, setOpen] = useState(false);
  const [wallet, setWallet] = useState<Connected | null>(null);
  const [which, setWhich] = useState<"address" | "paymentAddress">("address");
  const [note, setNote] = useState("");
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  const chosen = wallet ? wallet[which] : "";
  const step = link ? 3 : wallet ? 2 : 1;

  async function sign() {
    if (!wallet) return;
    setSigning(true);
    setError(null);
    try {
      const message = buildProofMessage(chosen, note, new Date());
      const signature = await signWithWallet(message, chosen);
      if (!signature) throw new Error("No signature returned");
      const token = encodeProof({ address: chosen, message, signature });
      setLink(`${window.location.origin}/verify?p=${token}`);
    } catch (err) {
      setError(walletErrorMessage(err));
    } finally {
      setSigning(false);
    }
  }

  async function reset() {
    await disconnectWallet();
    setWallet(null);
    setLink(null);
    setNote("");
    setError(null);
  }

  const addrs: ["address" | "paymentAddress", string][] = wallet
    ? wallet.paymentAddress && wallet.paymentAddress !== wallet.address
      ? [
          ["address", wallet.address],
          ["paymentAddress", wallet.paymentAddress],
        ]
      : [["address", wallet.address]]
    : [];

  return (
    <ol className="steps">
      <li className={step > 1 ? "done" : "current"}>
        <h2>Connect your wallet</h2>
        <div>
          {wallet ? (
            <p className="muted">
              Connected.{" "}
              <button type="button" className="btn btn-quiet btn-small" onClick={reset}>
                Use another wallet
              </button>
            </p>
          ) : (
            <>
              <p className="muted">Satscope reads your addresses. Nothing is sent or stored.</p>
              <div className="actions-row">
                <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
                  Connect wallet
                </button>
              </div>
            </>
          )}
        </div>
      </li>

      <li className={step > 2 ? "done" : step === 2 ? "current" : ""}>
        <h2>Choose the address and add a note</h2>
        {wallet && !link ? (
          <div className="stack">
            {addrs.length > 1 ? (
              <fieldset className="stack" aria-label="Address to prove">
                {addrs.map(([k, a]) => (
                  <label key={k} className="radio-row">
                    <input type="radio" name="which" checked={which === k} onChange={() => setWhich(k)} />
                    <span>
                      {k === "address" ? "Ordinals address" : "Payment address"} (
                      {ADDRESS_TYPE_LABEL[parseAddress(a) ?? "p2tr"]})<span className="addr"> {a}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            ) : (
              <p className="addr">{chosen}</p>
            )}
            <div>
              <label htmlFor="note">Note (optional)</label>
              <input
                id="note"
                className="field note-field"
                maxLength={MAX_NOTE}
                placeholder="For example: OTC trade with Sam, 6 November"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <p className="muted small-note">
                The note and today&apos;s date are part of the signed message, so the proof can&apos;t be reused for
                something else.
              </p>
            </div>
            <div className="actions-row">
              <button type="button" className="btn btn-primary" onClick={sign} disabled={signing}>
                {signing ? "Approve in your wallet…" : `Sign with ${shortAddress(chosen)}`}
              </button>
            </div>
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="muted">
            {link ? "Signed." : "Your wallet shows the exact message before you approve it. Signing costs nothing."}
          </p>
        )}
      </li>

      <li className={step === 3 ? "current" : ""}>
        <h2>Share the link</h2>
        {link ? (
          <div className="stack">
            <p className="muted">
              Anyone with this link can check the signature. It only proves you controlled the address when you signed.
            </p>
            <div className="share-box">
              <input
                className="field"
                readOnly
                value={link}
                aria-label="Proof link"
                onFocus={(e) => e.currentTarget.select()}
              />
              <CopyButton text={link} label="Copy link" className="btn btn-primary" />
            </div>
            <div className="actions-row">
              <a className="btn btn-quiet" href={link}>
                Open the proof
              </a>
              <button type="button" className="btn btn-quiet" onClick={() => setLink(null)}>
                Sign another
              </button>
            </div>
          </div>
        ) : (
          <p className="muted">You get a link that opens a page showing whether the signature is valid.</p>
        )}
      </li>

      <WalletDialog
        open={open}
        onClose={() => setOpen(false)}
        onConnected={(c) => {
          setWallet(c);
          setWhich("address");
          setOpen(false);
        }}
        note="Satscope will ask your wallet to sign one plain-text message. It never asks you to sign a transaction."
      />
    </ol>
  );
}
