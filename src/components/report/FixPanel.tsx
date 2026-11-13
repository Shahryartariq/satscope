"use client";

import { useMemo, useState } from "react";
import { shortAddress } from "@/lib/address";
import {
  atRiskCoins,
  effectiveRate,
  MIN_MERGE_COINS,
  planMerge,
  planMove,
  spendableCoins,
  SPENDABLE_TYPES,
  type FixCoin,
  type FixPlan,
  type PlanResult,
} from "@/lib/fix";
import { formatCount, formatRate, formatSats, formatUsd } from "@/lib/format";
import { mempoolTx } from "@/lib/site";
import type { AddressRole, AddressType, FeeRates } from "@/lib/types";
import { disconnectWallet, signPsbtWithWallet, walletErrorMessage, type Connected } from "../wallet/laserEyes";
import { WalletDialog } from "../wallet/WalletDialog";

export interface FixAddress {
  address: string;
  type: AddressType;
  role: AddressRole;
  indexed: boolean;
}

interface Props {
  addresses: FixAddress[];
  coins: FixCoin[];
  fees: FeeRates;
  usd: number | null;
}

type Candidate =
  | { kind: "move"; from: string; count: number; inscriptions: number; runes: number; to?: string }
  | { kind: "merge"; address: string; count: number; total: number };

type Speed = "fastest" | "halfHour" | "economy";
const SPEEDS: { id: Speed; label: string }[] = [
  { id: "fastest", label: "Next block" },
  { id: "halfHour", label: "About 30 minutes" },
  { id: "economy", label: "No rush" },
];

type Stage =
  | { name: "idle" }
  | { name: "review"; candidate: Candidate; wallet: Connected }
  | { name: "signing"; candidate: Candidate; wallet: Connected; plan: FixPlan }
  | {
      name: "signed";
      candidate: Candidate;
      wallet: Connected;
      plan: FixPlan;
      txHex: string;
      txid: string;
      vsize: number;
    }
  | { name: "sending"; plan: FixPlan; txid: string }
  | { name: "done"; txid: string; kind: Candidate["kind"] };

function candidatesFor(addresses: FixAddress[], coins: FixCoin[], rate: number): Candidate[] {
  const out: Candidate[] = [];
  const ordinals = addresses.find((a) => a.role === "ordinals");
  for (const a of addresses) {
    if (!a.indexed || !SPENDABLE_TYPES.includes(a.type)) continue;
    const payLike = a.role === "payment" || (a.role === "single" && a.type !== "p2tr");
    const risky = atRiskCoins(coins, a.address);
    if (payLike && risky.length > 0) {
      out.push({
        kind: "move",
        from: a.address,
        to: a.role === "payment" ? ordinals?.address : undefined,
        count: risky.length,
        inscriptions: risky.reduce((s, c) => s + c.inscriptions, 0),
        runes: risky.filter((c) => c.runes.length > 0).length,
      });
    }
    const plain = spendableCoins(coins, a.address, effectiveRate(rate));
    if (plain.length >= MIN_MERGE_COINS) {
      out.push({
        kind: "merge",
        address: a.address,
        count: plain.length,
        total: plain.reduce((s, c) => s + c.value, 0),
      });
    }
  }
  return out;
}

function titleFor(c: Candidate): string {
  if (c.kind === "merge") return `Merge ${c.count} coins in ${shortAddress(c.address)}`;
  const what = [
    c.inscriptions ? formatCount(c.inscriptions, "inscription") : "",
    c.runes ? `Runes on ${formatCount(c.runes, "coin")}` : "",
  ]
    .filter(Boolean)
    .join(" and ");
  return `Move ${what} to your Ordinals address`;
}

function blurb(c: Candidate): string {
  if (c.kind === "merge") {
    return "Combines plain bitcoin into one coin at the same address. Inscriptions and Runes are left alone.";
  }
  return "Sends each coin whole, so every inscription keeps its place. Fees come from plain bitcoin in the same address.";
}

export function FixPanel({ addresses, coins, fees, usd }: Props) {
  const [speed, setSpeed] = useState<Speed>("halfHour");
  const [stage, setStage] = useState<Stage>({ name: "idle" });
  const [pending, setPending] = useState<Candidate | null>(null);
  const [wallet, setWallet] = useState<Connected | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const rate = fees[speed];
  const candidates = useMemo(() => candidatesFor(addresses, coins, fees.economy), [addresses, coins, fees.economy]);
  const indexedEverywhere = addresses.every((a) => a.indexed);

  function planFor(c: Candidate, w: Connected): PlanResult {
    const indexed = (addr: string) => addresses.find((a) => a.address === addr)?.indexed ?? false;
    if (c.kind === "merge") return planMerge({ coins, address: c.address, feeRate: rate, indexed: indexed(c.address) });
    return planMove({ coins, from: c.from, to: w.address, feeRate: rate, indexed: indexed(c.from) });
  }

  function walletControls(c: Candidate, w: Connected): string | null {
    const owned = [w.address, w.paymentAddress];
    if (c.kind === "merge") {
      return owned.includes(c.address) ? null : `Connect the wallet that owns ${shortAddress(c.address)}.`;
    }
    if (w.paymentAddress !== c.from) return `Connect the wallet whose payment address is ${shortAddress(c.from)}.`;
    if (w.address === w.paymentAddress) {
      return "This wallet uses one address for everything, so there's no separate Ordinals address to move to.";
    }
    if (c.to && w.address !== c.to) return `This wallet's Ordinals address isn't ${shortAddress(c.to)}.`;
    return null;
  }

  function start(c: Candidate) {
    setError(null);
    setChecked(false);
    if (wallet) {
      const problem = walletControls(c, wallet);
      if (problem) return setError(problem);
      return setStage({ name: "review", candidate: c, wallet });
    }
    setPending(c);
  }

  function onConnected(w: Connected) {
    const c = pending!;
    setPending(null);
    setWallet(w);
    const problem = walletControls(c, w);
    if (problem) {
      setError(problem);
      void disconnectWallet();
      setWallet(null);
      return;
    }
    setStage({ name: "review", candidate: c, wallet: w });
  }

  async function sign(c: Candidate, w: Connected, plan: FixPlan) {
    setError(null);
    setStage({ name: "signing", candidate: c, wallet: w, plan });
    try {
      const { buildPsbt, checkSigned } = await import("@/lib/psbt");
      const psbt = buildPsbt(plan, w.keys);
      let signed: string;
      try {
        signed = await signPsbtWithWallet(
          psbt.toHex(),
          plan.inputs.map((i, index) => ({ index, address: i.address })),
        );
      } catch (err) {
        throw new Error(walletErrorMessage(err));
      }
      const result = checkSigned(plan, signed);
      setStage({
        name: "signed",
        candidate: c,
        wallet: w,
        plan,
        txHex: result.txHex,
        txid: result.txid,
        vsize: result.vsize,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while signing.");
      setStage({ name: "review", candidate: c, wallet: w });
    }
  }

  async function send(s: Extract<Stage, { name: "signed" }>) {
    setError(null);
    setStage({ name: "sending", plan: s.plan, txid: s.txid });
    try {
      const { broadcast } = await import("@/lib/psbt");
      const txid = await broadcast(s.txHex);
      setStage({ name: "done", txid, kind: s.candidate.kind });
      void disconnectWallet();
      setWallet(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The transaction couldn't be sent.");
      setStage(s);
    }
  }

  async function cancel() {
    setStage({ name: "idle" });
    setError(null);
    await disconnectWallet();
    setWallet(null);
  }

  if (candidates.length === 0 && stage.name === "idle") {
    return (
      <section className="panel" aria-labelledby="fix-title">
        <div className="panel-title">
          <h2 id="fix-title">Fix it with your wallet</h2>
        </div>
        <p className="muted">
          {indexedEverywhere
            ? "Nothing here needs a transaction. When inscriptions sit in a payment address or plain coins pile up, Satscope can build the fix for your wallet to sign."
            : "Fixes need the Ordinals index, so they're switched off until it answers. Check again in a little while."}
        </p>
      </section>
    );
  }

  return (
    <section className="panel fix-panel" aria-labelledby="fix-title">
      <div className="panel-title">
        <h2 id="fix-title">Fix it with your wallet</h2>
        <p>You review every coin, your wallet signs</p>
      </div>

      {stage.name === "idle" ? (
        <ul className="fix-list">
          {candidates.map((c) => (
            <li key={c.kind === "move" ? `move-${c.from}` : `merge-${c.address}`} className={`fix fix-${c.kind}`}>
              <div>
                <h3>{titleFor(c)}</h3>
                <p>{blurb(c)}</p>
              </div>
              <button
                type="button"
                className={`btn ${c.kind === "move" ? "btn-primary" : "btn-quiet"}`}
                onClick={() => start(c)}
              >
                {c.kind === "move" ? "Review the move" : "Review the merge"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {stage.name === "review" || stage.name === "signing" ? (
        <Review
          stage={stage}
          plan={planFor(stage.candidate, stage.wallet)}
          speed={speed}
          setSpeed={setSpeed}
          fees={fees}
          usd={usd}
          checked={checked}
          setChecked={setChecked}
          onSign={(plan) => sign(stage.candidate, stage.wallet, plan)}
          onCancel={cancel}
        />
      ) : null}

      {stage.name === "signed" || stage.name === "sending" ? (
        <div className="stack fix-signed" role="status">
          <p className="verdict ok">
            <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
              <circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M5 9.4l2.6 2.6L13 6.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Signed, and it matches what you reviewed
          </p>
          <p className="muted">
            Transaction <span className="mono">{stage.txid.slice(0, 12)}…</span>
            {stage.name === "signed"
              ? ` is ${stage.vsize} vB and pays ${formatSats(stage.plan.fee)} in fees.`
              : ""}{" "}
            Nothing has been sent yet.
          </p>
          <div className="actions-row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={stage.name === "sending"}
              onClick={() => stage.name === "signed" && send(stage)}
            >
              {stage.name === "sending" ? "Sending…" : "Send to the network"}
            </button>
            <button type="button" className="btn btn-quiet" onClick={cancel} disabled={stage.name === "sending"}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {stage.name === "done" ? (
        <div className="stack" role="status">
          <p className="verdict ok">Sent to the network</p>
          <p>
            {stage.kind === "move"
              ? "Your inscriptions and Runes are on their way to your Ordinals address."
              : "Your coins are being merged."}{" "}
            It confirms in the next few blocks. Run the checkup again after that.
          </p>
          <div className="actions-row">
            <a className="btn btn-primary" href={mempoolTx(stage.txid)} target="_blank" rel="noopener noreferrer">
              Track it on mempool.space
            </a>
            <button type="button" className="btn btn-quiet" onClick={() => setStage({ name: "idle" })}>
              Done
            </button>
          </div>
          <p className="muted small-note">
            Stuck? The transaction allows replace-by-fee, so most wallets can speed it up.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <WalletDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConnected={onConnected}
        note="Satscope builds the transaction and shows you every coin first. Your wallet signs it, and nothing is sent until you press Send."
      />
    </section>
  );
}

function Review({
  stage,
  plan: result,
  speed,
  setSpeed,
  fees,
  usd,
  checked,
  setChecked,
  onSign,
  onCancel,
}: {
  stage: Extract<Stage, { name: "review" | "signing" }>;
  plan: PlanResult;
  speed: Speed;
  setSpeed: (s: Speed) => void;
  fees: FeeRates;
  usd: number | null;
  checked: boolean;
  setChecked: (v: boolean) => void;
  onSign: (plan: FixPlan) => void;
  onCancel: () => void;
}) {
  const { candidate, wallet } = stage;
  const label = (address: string) =>
    address === wallet.address && wallet.address !== wallet.paymentAddress
      ? "Your Ordinals address"
      : address === wallet.paymentAddress
        ? wallet.address === wallet.paymentAddress
          ? "Your address"
          : "Your payment address"
        : shortAddress(address);
  const holds = (i: FixPlan["inputs"][number]) =>
    i.purpose === "fee"
      ? "Plain bitcoin, pays the fee"
      : i.purpose === "merge"
        ? "Plain bitcoin"
        : [i.inscriptions ? formatCount(i.inscriptions, "inscription") : "", i.runes.join(", ")]
            .filter(Boolean)
            .join(" + ");
  const outLabel = { moved: "Moved coin", change: "Change", merged: "Merged coin" } as const;

  return (
    <div className="stack">
      <h3 className="fix-heading">{titleFor(candidate)}</h3>
      <fieldset className="speed-row">
        <legend>Fee speed</legend>
        {SPEEDS.map((s) => (
          <label key={s.id} className="speed">
            <input type="radio" name="speed" checked={speed === s.id} onChange={() => setSpeed(s.id)} />
            <span>
              {s.label}
              <small>{formatRate(effectiveRate(fees[s.id]))}</small>
            </span>
          </label>
        ))}
      </fieldset>

      {!result.ok ? (
        <p className="form-error" role="alert">
          {result.reason}
        </p>
      ) : (
        <>
          <div className="cols fix-tables">
            <div>
              <h4>Coins spent</h4>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Coin</th>
                      <th scope="col">Holds</th>
                      <th scope="col" className="num">
                        Sats
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.plan.inputs.map((i) => (
                      <tr key={`${i.txid}:${i.vout}`}>
                        <td className="mono">
                          {i.txid.slice(0, 8)}…:{i.vout}
                        </td>
                        <td>{holds(i)}</td>
                        <td className="num">{i.value.toLocaleString("en-US")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h4>New coins</h4>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Goes to</th>
                      <th scope="col">What</th>
                      <th scope="col" className="num">
                        Sats
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.plan.outputs.map((o, idx) => (
                      <tr key={idx}>
                        <td title={o.address}>{label(o.address)}</td>
                        <td>{outLabel[o.purpose]}</td>
                        <td className="num">{o.value.toLocaleString("en-US")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <dl className="fee-strip fix-fee">
            <div>
              <dt>Network fee</dt>
              <dd>{formatSats(result.plan.fee)}</dd>
            </div>
            <div>
              <dt>In dollars</dt>
              <dd>{formatUsd(result.plan.fee, usd) ?? "—"}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>{result.plan.vbytes} vB</dd>
            </div>
            <div>
              <dt>Rate</dt>
              <dd>{formatRate(result.plan.feeRate)}</dd>
            </div>
          </dl>
          <label className="confirm-row">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <span>
              I&apos;ve checked that every new coin goes to my own address ({shortAddress(wallet.address)}
              {wallet.paymentAddress !== wallet.address ? ` or ${shortAddress(wallet.paymentAddress)}` : ""}).
            </span>
          </label>
        </>
      )}

      <div className="actions-row">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!result.ok || !checked || stage.name === "signing"}
          onClick={() => result.ok && onSign(result.plan)}
        >
          {stage.name === "signing" ? "Approve in your wallet…" : "Sign in your wallet"}
        </button>
        <button type="button" className="btn btn-quiet" onClick={onCancel} disabled={stage.name === "signing"}>
          Cancel
        </button>
      </div>
      <p className="muted small-note">
        Your wallet shows the same coins before you approve. Satscope checks the signed transaction against this list
        and refuses to send anything different.
      </p>
    </div>
  );
}
