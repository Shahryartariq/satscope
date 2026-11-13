import { packCoins, type MapCoin } from "@/lib/coinmap";
import type { CoinKind } from "@/lib/types";
import { HoverLabel } from "./HoverLabel";

export const KIND_LABEL: Record<CoinKind, string> = {
  clean: "Spendable bitcoin",
  inscribed: "Inscription",
  runic: "Runes",
  mixed: "Inscription and Runes",
  uneconomical: "Costs more to spend than it holds",
  unverified: "Check first (likely inscription postage)",
};

function Glyph({ kind, cx, cy, r }: { kind: CoinKind; cx: number; cy: number; r: number }) {
  const s = Math.max(2.4, r * 0.32);
  if (kind === "inscribed" || kind === "mixed") {
    // An engraved diamond: the inscription mark.
    const d = `M${cx} ${cy - s}L${cx + s} ${cy}L${cx} ${cy + s}L${cx - s} ${cy}Z`;
    return <path d={d} className="glyph glyph-inscribed" />;
  }
  if (kind === "runic") {
    const d = `M${cx} ${cy - s}L${cx + s * 0.9} ${cy + s * 0.7}L${cx - s * 0.9} ${cy + s * 0.7}Z`;
    return <path d={d} className="glyph glyph-runic" />;
  }
  if (kind === "unverified")
    return <circle cx={cx} cy={cy} r={Math.max(1.4, s * 0.45)} className="glyph glyph-unverified" />;
  return null;
}

export interface CoinMapProps {
  coins: (MapCoin & { label: string; href?: string })[];
  width?: number;
  animate?: boolean;
  /** Accessible name for the whole picture. */
  title: string;
  idPrefix?: string;
}

/**
 * Every unspent coin drawn to scale (log of its value), coloured by what it carries.
 * Plain SVG attributes only, so it works under a strict CSP. Labels are shown by
 * HoverLabel instead of SVG <title> elements (some browser security extensions
 * treat <title> text as the page title and misjudge the page).
 */
export function CoinMap({ coins, width = 960, animate = true, title, idPrefix = "map" }: CoinMapProps) {
  const { placed, height, hidden } = packCoins(coins, width);
  const labelId = `${idPrefix}-label`;
  return (
    <div className="coin-map-wrap" data-hover-root={labelId}>
      <svg
        className={`coin-map${animate ? " animate" : ""}`}
        viewBox={`0 0 ${width} ${Math.max(height, 40)}`}
        role={coins.some((c) => c.href) ? "group" : "img"}
        aria-label={title}
      >
        <defs>
          <linearGradient id={`${idPrefix}-scan`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--orange)" stopOpacity="0" />
            <stop offset="0.5" stopColor="var(--orange)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--orange)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {placed.map((c, i) => {
          const body = (
            <>
              <circle cx={c.cx} cy={c.cy} r={c.r} className={`coin k-${c.kind}`} />
              <Glyph kind={c.kind} cx={c.cx} cy={c.cy} r={c.r} />
            </>
          );
          const cls = `coin-group d${Math.min(9, Math.floor((i / Math.max(1, placed.length)) * 10))}`;
          return c.href ? (
            <a key={c.key} href={c.href} className={cls} aria-label={c.label} data-label={c.label}>
              {body}
            </a>
          ) : (
            <g key={c.key} className={cls} data-label={c.label}>
              {body}
            </g>
          );
        })}
        <rect
          className="scan"
          fill={`url(#${idPrefix}-scan)`}
          x="0"
          y="0"
          width={width * 0.25}
          height={Math.max(height, 40)}
        />
      </svg>
      {hidden > 0 ? (
        <p className="hover-label">
          Showing {placed.length} coins here. The other {hidden} are in the table below.
        </p>
      ) : null}
      <HoverLabel id={labelId} />
    </div>
  );
}

export function Legend({ kinds }: { kinds: CoinKind[] }) {
  return (
    <ul className="legend" aria-label="What the colours mean">
      {kinds.map((k) => (
        <li key={k}>
          <span className={`kind-dot kd-${k}`} aria-hidden="true" />
          {KIND_LABEL[k]}
        </li>
      ))}
    </ul>
  );
}
