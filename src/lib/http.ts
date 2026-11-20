import "server-only";

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

const USER_AGENT = "Satscope/1.0 (+https://satscope.vercel.app)";
/** No API answer Satscope uses comes near this; a bigger one is a fault, not data. */
export const MAX_RESPONSE_BYTES = 5_000_000;

async function readText(res: Response, url: string): Promise<string> {
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_RESPONSE_BYTES) {
    await res.body?.cancel().catch(() => {});
    throw new UpstreamError(`${new URL(url).host} sent too much data`, res.status);
  }
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel().catch(() => {});
      throw new UpstreamError(`${new URL(url).host} sent too much data`, res.status);
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function fetchText(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<string> {
  const { timeoutMs = 8000, headers, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: { "User-Agent": USER_AGENT, Accept: "application/json, text/plain", ...headers },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  const text = await readText(res, url);
  if (!res.ok) throw new UpstreamError(`${new URL(url).host} answered ${res.status}`, res.status, text.slice(0, 200));
  return text;
}

export async function fetchJson<T>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const text = await fetchText(url, init);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new UpstreamError(`${new URL(url).host} sent something that isn't JSON`);
  }
}
