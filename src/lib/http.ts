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

export async function fetchText(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<string> {
  const { timeoutMs = 8000, headers, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: { "User-Agent": USER_AGENT, Accept: "application/json, text/plain", ...headers },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  const text = await res.text();
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
