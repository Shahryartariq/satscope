import type { CoinKind } from "./types";

export interface MapCoin {
  key: string;
  value: number;
  kind: CoinKind;
}

export type PlacedCoin<T extends MapCoin = MapCoin> = T & {
  cx: number;
  cy: number;
  r: number;
};

export const KIND_ORDER: CoinKind[] = ["mixed", "inscribed", "runic", "unverified", "clean", "uneconomical"];

const LOG_SPAN = Math.log10(100_000_000 / 300 + 1);

/** Radius grows with the log of the value, so a 330-sat coin and a 1 BTC coin both stay visible. */
export function radiusFor(value: number, min = 8, max = 44): number {
  const t = Math.min(1, Math.log10(Math.max(1, value) / 300 + 1) / LOG_SPAN);
  return Math.round((min + (max - min) * Math.sqrt(t)) * 10) / 10;
}

/**
 * Packs coins left to right in rows, grouped by kind and then by value, inside
 * a box `width` wide. Each coin sits on the vertical centre of its row.
 */
export function packCoins<T extends MapCoin>(
  coins: T[],
  width: number,
  gap = 6,
  maxCoins = 400,
): { placed: PlacedCoin<T>[]; height: number; hidden: number } {
  const sorted = [...coins].sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || b.value - a.value,
  );
  const shown = sorted.slice(0, maxCoins);
  const placed: PlacedCoin<T>[] = [];
  let row: PlacedCoin<T>[] = [];
  let x = gap;
  let top = gap;
  let rowHeight = 0;

  const closeRow = () => {
    for (const p of row) p.cy = top + rowHeight / 2;
    placed.push(...row);
    top += rowHeight + gap;
    row = [];
    x = gap;
    rowHeight = 0;
  };

  for (const c of shown) {
    const r = radiusFor(c.value);
    if (x + r * 2 > width - gap && row.length > 0) closeRow();
    row.push({ ...c, cx: x + r, cy: 0, r });
    x += r * 2 + gap;
    rowHeight = Math.max(rowHeight, r * 2);
  }
  if (row.length) closeRow();
  return { placed, height: placed.length ? top : gap * 2, hidden: sorted.length - shown.length };
}
