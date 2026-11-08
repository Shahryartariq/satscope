import "server-only";
import { cached } from "./cache";
import { isTextType, MAX_TEXT_BYTES, type InscriptionMeta } from "./inscriptionPreview";
import { SAMPLE_INSCRIPTIONS, isSampleMode } from "./sample";

/**
 * Content type and short text of an inscription, read on the server. Content
 * never changes once inscribed, so results are cached for 30 days.
 *
 * UniSat's public content server comes first: ordinals.com sits behind a
 * Cloudflare bot check that answers Vercel's servers with 403. Visitors'
 * browsers still load images and previews from ordinals.com.
 */
export const CONTENT_SOURCES = ["https://static.unisat.io/content", "https://ordinals.com/content"];
const TTL = 30 * 24 * 3600;
const HEADERS = { "User-Agent": "Satscope/1.0 (+https://satscope.vercel.app)" };

/** Reads at most `max` + 1 bytes, so a large text inscription is never downloaded in full. */
async function readCapped(res: Response, max: number): Promise<Uint8Array> {
  const reader = res.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size <= max) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

export async function loadFrom(base: string, id: string): Promise<InscriptionMeta> {
  const url = `${base}/${id}`;
  const head = await fetch(url, {
    method: "HEAD",
    headers: HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });
  const contentType = head.headers.get("content-type");
  if (!head.ok || !contentType) throw new Error(`${new URL(base).host} answered ${head.status}`);
  const lengthHeader = head.headers.get("content-length");
  const meta: InscriptionMeta = {
    id,
    contentType,
    contentLength: lengthHeader ? Number(lengthHeader) : null,
    delegate: null,
  };
  if (isTextType(contentType) && (meta.contentLength ?? 0) <= MAX_TEXT_BYTES) {
    const res = await fetch(url, { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`${new URL(base).host} answered ${res.status}`);
    const bytes = await readCapped(res, MAX_TEXT_BYTES);
    if (bytes.byteLength <= MAX_TEXT_BYTES) {
      meta.text = new TextDecoder().decode(bytes);
      meta.contentLength = bytes.byteLength;
    }
  }
  return meta;
}

const VALID_ID = /^[0-9a-f]{64}i\d+$/;

/** Details for one inscription, or null if no source answers (the tile then shows the ordinals.com preview). */
export async function getInscriptionMeta(id: string): Promise<InscriptionMeta | null> {
  if (!VALID_ID.test(id)) return null;
  if (isSampleMode()) return SAMPLE_INSCRIPTIONS[id] ?? null;
  try {
    return await cached(`insc:${id}`, TTL, async () => {
      const errors: string[] = [];
      for (const base of CONTENT_SOURCES) {
        try {
          return await loadFrom(base, id);
        } catch (err) {
          errors.push(err instanceof Error ? err.message : String(err));
        }
      }
      throw new Error(errors.join("; "));
    });
  } catch (err) {
    console.warn(`[ordinals] ${id}: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}
