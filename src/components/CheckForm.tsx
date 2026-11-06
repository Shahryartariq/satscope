"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { looksLikeTestnet, normalizeAddress, parseAddress } from "@/lib/address";
import { disconnectWallet, type Connected } from "./wallet/laserEyes";
import { WalletDialog } from "./wallet/WalletDialog";

export function CheckForm({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [going, setGoing] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const addr = normalizeAddress(value);
    if (!addr) return setError("Paste a Bitcoin address first.");
    if (looksLikeTestnet(addr)) return setError("That's a testnet address. Satscope checks Bitcoin mainnet addresses.");
    if (!parseAddress(addr))
      return setError("That doesn't look like a Bitcoin address. Check for missing or extra characters.");
    setError(null);
    setGoing(true);
    router.push(`/address/${encodeURIComponent(addr)}`);
  }

  function connected(c: Connected) {
    setOpen(false);
    setGoing(true);
    // Satscope only needs the addresses; drop the connection straight away.
    void disconnectWallet();
    const params = new URLSearchParams({ o: c.address });
    if (c.paymentAddress && c.paymentAddress !== c.address) params.set("p", c.paymentAddress);
    router.push(`/wallet?${params}`);
  }

  return (
    <div className="check-form">
      <form onSubmit={submit} noValidate>
        <label htmlFor="address" className="sr-only">
          Bitcoin address
        </label>
        <div className="row">
          <input
            id="address"
            name="address"
            className="field"
            placeholder="Paste a Bitcoin address (bc1p…, bc1q…, 1…, 3…)"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            autoFocus={autoFocus}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "address-error" : undefined}
          />
          <button type="submit" className="btn btn-primary" disabled={going}>
            {going ? "Checking…" : "Check wallet"}
          </button>
        </div>
        {error ? (
          <p id="address-error" className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
      <div className="or-row">or</div>
      <button type="button" className="btn btn-quiet" onClick={() => setOpen(true)} disabled={going}>
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <rect x="1.5" y="4" width="15" height="11" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M1.5 7.5h15M12 11h1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        Connect wallet to check both addresses
      </button>
      <WalletDialog
        open={open}
        onClose={() => setOpen(false)}
        onConnected={connected}
        note="Satscope only reads your Ordinals and payment addresses. It never asks you to sign or send anything here."
      />
    </div>
  );
}
