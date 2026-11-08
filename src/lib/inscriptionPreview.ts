/**
 * Decides how to show an inscription in the gallery. Pure, so it is unit-tested
 * and safe to import anywhere. Content itself always loads from ordinals.com:
 * images as <img> (no scripts), everything else that isn't plain text in a
 * sandboxed iframe of ordinals.com's own preview page.
 */

export interface InscriptionMeta {
  id: string;
  number?: number;
  contentType: string | null;
  contentLength: number | null;
  /** The inscription's content, only for short text inscriptions. */
  text?: string;
  /** Set when the inscription shows another inscription's content. */
  delegate?: string | null;
}

export interface Brc20 {
  op: "deploy" | "mint" | "transfer";
  tick: string;
  /** Decimal string as written in the inscription. */
  amount: string | null;
}

export type Preview =
  | { kind: "brc20"; brc20: Brc20 }
  | { kind: "image"; pixelated: boolean }
  | { kind: "text"; text: string }
  | { kind: "frame" };

/** Text inscriptions up to this size are fetched and shown inline. */
export const MAX_TEXT_BYTES = 2048;
/** Image inscriptions this small are usually pixel art, drawn with hard edges when scaled. */
export const PIXEL_ART_BYTES = 12_000;

/** Raster formats a browser can draw in <img>. SVG goes in the frame because it often loads other inscriptions. */
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif", "image/bmp"]);

export function baseType(contentType: string | null | undefined): string {
  return (contentType ?? "").split(";")[0]!.trim().toLowerCase();
}

export function isTextType(contentType: string | null | undefined): boolean {
  const t = baseType(contentType);
  return t === "text/plain" || t === "application/json" || t === "text/markdown";
}

const DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

/** Reads a BRC-20 operation from inscription text, or null when it isn't a valid one. */
export function parseBrc20(text: string): Brc20 | null {
  if (text.length > 512) return null;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const o = json as Record<string, unknown>;
  if (o.p !== "brc-20" || typeof o.tick !== "string") return null;
  const op = o.op;
  if (op !== "deploy" && op !== "mint" && op !== "transfer") return null;
  // Tickers are 4 or 5 bytes (some are a single emoji or symbol of several code units).
  const bytes = new TextEncoder().encode(o.tick).length;
  if (bytes < 1 || bytes > 5) return null;
  const raw = op === "deploy" ? o.max : o.amt;
  const amount = typeof raw === "string" && DECIMAL.test(raw) ? raw : null;
  if (op !== "deploy" && amount == null) return null;
  return { op, tick: o.tick, amount };
}

export function previewFor(meta: InscriptionMeta | null): Preview {
  if (!meta || meta.delegate) return { kind: "frame" };
  const type = baseType(meta.contentType);
  if (meta.text != null) {
    const brc20 = parseBrc20(meta.text.trim());
    if (brc20) return { kind: "brc20", brc20 };
    return { kind: "text", text: meta.text };
  }
  if (IMAGE_TYPES.has(type)) {
    return { kind: "image", pixelated: (meta.contentLength ?? Infinity) <= PIXEL_ART_BYTES };
  }
  return { kind: "frame" };
}

/** Groups digits of a decimal string without losing precision: "10000000000.5" → "10,000,000,000.5". */
export function groupDigits(amount: string): string {
  const [int, frac] = amount.split(".");
  const grouped = int!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${grouped}.${frac}` : grouped;
}

/** Adds decimal strings exactly (BRC-20 amounts can exceed Number precision). */
export function addDecimals(a: string, b: string): string {
  const [ai, af = ""] = a.split(".");
  const [bi, bf = ""] = b.split(".");
  const scale = Math.max(af.length, bf.length);
  const sum = BigInt(ai! + af.padEnd(scale, "0")) + BigInt(bi! + bf.padEnd(scale, "0"));
  if (scale === 0) return sum.toString();
  const s = sum.toString().padStart(scale + 1, "0");
  const frac = s.slice(-scale).replace(/0+$/, "");
  return frac ? `${s.slice(0, -scale)}.${frac}` : s.slice(0, -scale);
}

/** Short label for the content type shown under each tile. */
export function typeLabel(preview: Preview, contentType: string | null): string {
  if (preview.kind === "brc20") return `BRC-20 ${preview.brc20.op}`;
  const t = baseType(contentType);
  if (!t) return "Inscription";
  const known: Record<string, string> = {
    "text/plain": "Text",
    "text/markdown": "Markdown",
    "application/json": "JSON",
    "text/html": "HTML",
    "image/svg+xml": "SVG",
    "image/jpeg": "JPEG",
    "model/gltf-binary": "3D model",
    "application/pdf": "PDF",
  };
  if (known[t]) return known[t];
  const [major, minor = ""] = t.split("/");
  if (major === "image") return minor.toUpperCase();
  if (major === "video") return `Video (${minor})`;
  if (major === "audio") return `Audio (${minor})`;
  return t;
}
