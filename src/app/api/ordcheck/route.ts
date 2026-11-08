export const dynamic = "force-dynamic";
const IDS = [
  "bf4c141c6b623d46983401133f7548206db434c46404286c814cf9db9e3685b2i0",
  "6fb976ab49dcec017f1e201e84395983204ae1a7c2abf7ced0a85d692e442799i0",
];
async function probe(url: string, method: string, headers: Record<string, string> = {}) {
  try {
    const r = await fetch(url, { method, headers, cache: "no-store", signal: AbortSignal.timeout(8000) });
    const t = method === "HEAD" ? "" : (await r.arrayBuffer()).byteLength + " bytes";
    return { url: url.slice(-20), method, status: r.status, ct: r.headers.get("content-type"), len: r.headers.get("content-length"), range: r.headers.get("content-range"), acao: r.headers.get("access-control-allow-origin"), cache: r.headers.get("cache-control"), body: t };
  } catch (e) {
    return { url, method, error: String(e) };
  }
}
export async function GET() {
  const out = [];
  for (const id of IDS) {
    out.push(await probe(`https://static.unisat.io/content/${id}`, "HEAD"));
    out.push(await probe(`https://static.unisat.io/content/${id}`, "GET", { Range: "bytes=0-0" }));
    out.push(await probe(`https://static.unisat.io/preview/${id}`, "HEAD"));
  }
  return Response.json(out);
}
