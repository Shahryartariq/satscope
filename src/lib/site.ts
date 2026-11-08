export const SITE_NAME = "Satscope";
export const SITE_URL = (process.env.SITE_URL || "https://satscope.vercel.app").replace(/\/$/, "");
export const SITE_TAGLINE = "Free Bitcoin wallet checkup";
export const SITE_DESCRIPTION =
  "Check any Bitcoin wallet for free: BTC, Ordinals and Runes in one view, warnings before an inscription gets spent as a fee, fee costs, and signed proof that an address is yours.";
export const REPO_URL = "https://github.com/Shahryartariq/satscope";
export const AUTHOR = { name: "Muhammad Shehryar", url: "https://github.com/Shahryartariq" };

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function mempoolTx(txid: string): string {
  return `https://mempool.space/tx/${txid}`;
}

export function mempoolAddress(address: string): string {
  return `https://mempool.space/address/${address}`;
}

export function ordinalsInscription(id: string): string {
  return `https://ordinals.com/inscription/${id}`;
}

export function ordinalsContent(id: string): string {
  return `https://ordinals.com/content/${id}`;
}

export function ordinalsPreview(id: string): string {
  return `https://ordinals.com/preview/${id}`;
}

export function ordinalsAddress(address: string): string {
  return `https://ordinals.com/address/${address}`;
}
