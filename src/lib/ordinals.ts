import "server-only";
import { cached } from "./cache";
import { fetchJson, fetchText } from "./http";
import { isTextType, MAX_TEXT_BYTES, type InscriptionMeta } from "./inscriptionPreview";
import { SAMPLE_INSCRIPTIONS, isSampleMode } from "./sample";

/**
 * Inscription details from ordinals.com, the public server run by the ord
 * project. No key needed. Content never changes once inscribed, so results are
 * cached for 30 days.
 */

const BASE = "https://ordinals.com";
const TTL = 30 * 24 * 3600;

interface OrdInscription {
  id: string;
  number?: number;
  content_type?: string | null;
  content_length?: number | null;
  delegate?: string | null;
}

async function load(id: string): Promise<InscriptionMeta> {
  const r = await fetchJson<OrdInscription>(`${BASE}/r/inscription/${id}`, { timeoutMs: 6000 });
  const meta: InscriptionMeta = {
    id,
    number: r.number,
    contentType: r.content_type ?? null,
    contentLength: r.content_length ?? null,
    delegate: r.delegate ?? null,
  };
  if (!meta.delegate && isTextType(meta.contentType) && (meta.contentLength ?? Infinity) <= MAX_TEXT_BYTES) {
    meta.text = (await fetchText(`${BASE}/content/${id}`, { timeoutMs: 6000 })).slice(0, MAX_TEXT_BYTES);
  }
  return meta;
}

const VALID_ID = /^[0-9a-f]{64}i\d+$/;

/** Details for one inscription, or null if ordinals.com doesn't answer. */
export async function getInscriptionMeta(id: string): Promise<InscriptionMeta | null> {
  if (!VALID_ID.test(id)) return null;
  if (isSampleMode()) return SAMPLE_INSCRIPTIONS[id] ?? null;
  try {
    return await cached(`insc:${id}`, TTL, () => load(id));
  } catch {
    return null;
  }
}
