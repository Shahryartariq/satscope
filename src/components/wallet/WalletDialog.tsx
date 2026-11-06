"use client";

import { useEffect, useRef, useState } from "react";
import { connectWallet, listWallets, walletErrorMessage, type Connected, type WalletOption } from "./laserEyes";

interface Props {
  open: boolean;
  onClose: () => void;
  onConnected: (c: Connected) => void;
  /** Shown under the title, e.g. "Satscope only reads your addresses." */
  note: string;
}

export function WalletDialog({ open, onClose, onConnected, note }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [wallets, setWallets] = useState<WalletOption[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      setError(null);
      listWallets()
        .then(setWallets)
        .catch(() => setError("The wallet connector failed to load. Reload the page and try again."));
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  async function pick(w: WalletOption) {
    setBusy(w.id);
    setError(null);
    try {
      const c = await connectWallet(w.id);
      onConnected(c);
    } catch (err) {
      setError(walletErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const installed = wallets?.filter((w) => w.installed) ?? [];
  const others = wallets?.filter((w) => !w.installed) ?? [];

  return (
    <dialog ref={ref} className="wallets" aria-labelledby="wallets-title" onClose={onClose} onCancel={onClose}>
      <div className="wallets-head">
        <h2 id="wallets-title">Connect a Bitcoin wallet</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {wallets === null && !error ? (
        <p className="wallets-foot" role="status">
          Looking for wallets in this browser…
        </p>
      ) : null}
      {wallets !== null ? (
        <ul className="wallets-list">
          {installed.map((w) => (
            <li key={w.id}>
              <button type="button" onClick={() => pick(w)} disabled={busy !== null}>
                {w.name}
                <span className="hint">{busy === w.id ? "Check your wallet…" : "Installed"}</span>
              </button>
            </li>
          ))}
          {installed.length === 0 ? (
            <li className="wallets-foot">
              No Bitcoin wallet found in this browser. Install one of these, or paste an address instead.
            </li>
          ) : null}
          {others.map((w) => (
            <li key={w.id}>
              <a href={w.url} target="_blank" rel="noopener noreferrer">
                {w.name}
                <span className="hint">Get it</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p className="form-error wallets-foot" role="alert">
          {error}
        </p>
      ) : null}
      <p className="wallets-foot">{note}</p>
    </dialog>
  );
}
