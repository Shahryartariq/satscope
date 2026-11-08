export const dynamic = "force-dynamic";
const ID = "bf4c141c6b623d46983401133f7548206db434c46404286c814cf9db9e3685b2i0";
async function probe(url: string, headers: Record<string, string>) {
  try {
    const r = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(8000) });
    const t = await r.text();
    return { url, status: r.status, server: r.headers.get("server"), ct: r.headers.get("content-type"), body: t.slice(0, 160) };
  } catch (e) {
    return { url, error: String(e), cause: String((e as { cause?: unknown }).cause ?? "") };
  }
}
export async function GET() {
  const ua = { "User-Agent": "Satscope/1.0 (+https://satscope.vercel.app)", Accept: "application/json, text/plain" };
  const out = await Promise.all([
    probe(`https://ordinals.com/r/inscription/${ID}`, ua),
    probe(`https://ordinals.com/r/inscription/${ID}`, { Accept: "application/json" }),
    probe(`https://ordinals.com/inscription/${ID}`, { Accept: "application/json" }),
    probe(`https://ordinals.com/content/${ID}`, ua),
    probe(`https://static.unisat.io/content/${ID}`, ua),
  ]);
  return Response.json(out);
}
