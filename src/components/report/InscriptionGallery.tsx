import { Suspense } from "react";
import { formatCount } from "@/lib/format";
import {
  addDecimals,
  groupDigits,
  previewFor,
  typeLabel,
  type InscriptionMeta,
  type Preview,
} from "@/lib/inscriptionPreview";
import { getInscriptionMeta } from "@/lib/ordinals";
import { ordinalsAddress, ordinalsContent, ordinalsInscription, ordinalsPreview } from "@/lib/site";
import { coinAnchor } from "./Findings";

/** Tiles drawn per report. Each needs one lookup on ordinals.com (cached for 30 days). */
export const GALLERY_LIMIT = 24;

export interface GalleryItem {
  id: string;
  number?: number;
  outpoint: string;
  value: number;
  address: string;
  /** True when the coin sits in the wallet's payment address, where it can be spent as a fee. */
  atRisk: boolean;
  role: "ordinals" | "payment" | "single";
}

const ROLE_LINK = {
  ordinals: "All in your Ordinals address",
  payment: "All in your payment address",
  single: "See them all on ordinals.com",
} as const;

function numberLabel(item: GalleryItem, meta: InscriptionMeta | null): string {
  const n = item.number ?? meta?.number;
  return n != null ? `#${n.toLocaleString("en-US")}` : `${item.id.slice(0, 8)}…${item.id.slice(-4)}`;
}

function Art({ item, preview, label }: { item: GalleryItem; preview: Preview; label: string }) {
  switch (preview.kind) {
    case "brc20":
      return (
        <div className="brc20">
          <span className="brc20-tick">{preview.brc20.tick}</span>
          {preview.brc20.amount ? <span className="brc20-amt">{groupDigits(preview.brc20.amount)}</span> : null}
          {preview.brc20.op === "deploy" ? <span className="brc20-op">max supply</span> : null}
        </div>
      );
    case "image":
      return (
        <img
          src={ordinalsContent(item.id)}
          alt={`Inscription ${label}`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className={preview.pixelated ? "pixel" : undefined}
        />
      );
    case "text":
      return <p className="ins-text">{preview.text}</p>;
    case "frame":
      return (
        <iframe
          src={ordinalsPreview(item.id)}
          title={`Inscription ${label}`}
          sandbox="allow-scripts"
          loading="lazy"
          referrerPolicy="no-referrer"
          tabIndex={-1}
        />
      );
  }
}

function Tile({ item, meta, loading }: { item: GalleryItem; meta: InscriptionMeta | null; loading?: boolean }) {
  const label = numberLabel(item, meta);
  const preview = previewFor(meta);
  return (
    <li className={`ins-tile${item.atRisk ? " at-risk" : ""}`}>
      <figure>
        <div className={`ins-art art-${loading ? "loading" : preview.kind}`}>
          {loading ? (
            <span className="ins-wait">Loading preview</span>
          ) : (
            <Art item={item} preview={preview} label={label} />
          )}
        </div>
        <figcaption>
          <a className="ins-num" href={ordinalsInscription(item.id)} rel="noopener noreferrer" target="_blank">
            {label}
          </a>
          <span className="ins-type">{loading ? "Inscription" : typeLabel(preview, meta?.contentType ?? null)}</span>
          <a className="ins-coin" href={`#${coinAnchor(item.outpoint)}`}>
            on a {item.value.toLocaleString("en-US")}-sat coin
          </a>
          {item.atRisk ? <span className="chip chip-warn">In payment address</span> : null}
        </figcaption>
      </figure>
    </li>
  );
}

interface Brc20Total {
  tick: string;
  amount: string;
  count: number;
}

function brc20Transfers(metas: (InscriptionMeta | null)[]): Brc20Total[] {
  const totals = new Map<string, Brc20Total>();
  for (const meta of metas) {
    const p = previewFor(meta);
    if (p.kind !== "brc20" || p.brc20.op !== "transfer" || !p.brc20.amount) continue;
    const key = p.brc20.tick.toLowerCase();
    const cur = totals.get(key);
    totals.set(key, {
      tick: cur?.tick ?? p.brc20.tick,
      amount: cur ? addDecimals(cur.amount, p.brc20.amount) : p.brc20.amount,
      count: (cur?.count ?? 0) + 1,
    });
  }
  return [...totals.values()].sort((a, b) => b.count - a.count);
}

async function LoadedGrid({ items, total }: { items: GalleryItem[]; total: number }) {
  const metas = await Promise.all(items.map((i) => getInscriptionMeta(i.id)));
  const transfers = brc20Transfers(metas);
  const truncated = total > items.length;
  return (
    <>
      {transfers.length ? (
        <div className="brc20-summary">
          <p>
            <strong>BRC-20 tokens waiting to be sent{truncated ? ` (in the ${items.length} shown)` : ""}:</strong>{" "}
            {transfers.map((t, i) => (
              <span key={t.tick}>
                {i ? ", " : ""}
                <span className="mono">
                  {groupDigits(t.amount)} {t.tick}
                </span>{" "}
                on {formatCount(t.count, "inscription")}
              </span>
            ))}
            .
          </p>
          <p className="muted">
            A transfer inscription holds its tokens until you send it. If a wallet spends it as a fee, the tokens go to
            the miner.
          </p>
        </div>
      ) : null}
      <ul className="ins-grid" data-state="loaded">
        {items.map((item, i) => (
          <Tile key={item.id} item={item} meta={metas[i]!} />
        ))}
      </ul>
    </>
  );
}

function LoadingGrid({ items }: { items: GalleryItem[] }) {
  return (
    <ul className="ins-grid" data-state="loading" aria-busy="true">
      {items.map((item) => (
        <Tile key={item.id} item={item} meta={null} loading />
      ))}
    </ul>
  );
}

export function InscriptionGallery({ items }: { items: GalleryItem[] }) {
  // Coins in a payment address come first: those are the ones at risk.
  const ordered = [...items].sort((a, b) => Number(b.atRisk) - Number(a.atRisk));
  const shown = ordered.slice(0, GALLERY_LIMIT);
  const addresses = [...new Map(items.map((i) => [i.address, i.role])).entries()];
  return (
    <section className="panel gallery" aria-labelledby="ins-title">
      <div className="panel-title">
        <h2 id="ins-title">Inscriptions</h2>
        <p>{formatCount(items.length, "inscription")}</p>
      </div>
      <Suspense fallback={<LoadingGrid items={shown} />}>
        <LoadedGrid items={shown} total={items.length} />
      </Suspense>
      <p className="muted small-note">
        {items.length > shown.length ? `Showing ${shown.length} of ${items.length}. ` : ""}
        Previews load from ordinals.com.{" "}
        {addresses.map(([address, role], i) => (
          <span key={address}>
            {i ? ", " : ""}
            <a href={ordinalsAddress(address)} rel="noopener noreferrer" target="_blank">
              {ROLE_LINK[role]}
            </a>
          </span>
        ))}
      </p>
    </section>
  );
}
