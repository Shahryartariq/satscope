import { afterEach, describe, expect, it, vi } from "vitest";
import { getInscriptionMeta, loadFrom } from "@/lib/ordinals";

const ID = "bf4c141c6b623d46983401133f7548206db434c46404286c814cf9db9e3685b2i0";
const BRC20 = '{"p":"brc-20","op":"transfer","tick":"𝛑","amt":"10000000000"}';

afterEach(() => vi.unstubAllGlobals());

/** Mirrors what static.unisat.io sent Vercel on 2026-11-08: text without a length, images with one. */
function stubSources(byHost: Record<string, (method: string) => Response>) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      calls.push(`${method} ${url}`);
      const host = new URL(url).host;
      return byHost[host]?.(method) ?? new Response("nope", { status: 404 });
    }),
  );
  return calls;
}

describe("inscription details", () => {
  it("reads content type and short text from UniSat's content server", async () => {
    const calls = stubSources({
      "static.unisat.io": (m) =>
        new Response(m === "HEAD" ? null : BRC20, { headers: { "content-type": "text/plain;charset=utf-8" } }),
    });
    const meta = await loadFrom("https://static.unisat.io/content", ID);
    expect(meta).toMatchObject({ contentType: "text/plain;charset=utf-8", text: BRC20, contentLength: 64 });
    expect(calls).toEqual([
      `HEAD https://static.unisat.io/content/${ID}`,
      `GET https://static.unisat.io/content/${ID}`,
    ]);
  });

  it("only asks for the type of an image", async () => {
    const calls = stubSources({
      "static.unisat.io": () =>
        new Response(null, { headers: { "content-type": "image/png", "content-length": "793" } }),
    });
    const meta = await loadFrom("https://static.unisat.io/content", ID);
    expect(meta).toMatchObject({ contentType: "image/png", contentLength: 793 });
    expect(meta.text).toBeUndefined();
    expect(calls).toHaveLength(1);
  });

  it("doesn't keep long text", async () => {
    stubSources({
      "static.unisat.io": (m) =>
        new Response(m === "HEAD" ? null : "x".repeat(10_000), { headers: { "content-type": "text/plain" } }),
    });
    const meta = await loadFrom("https://static.unisat.io/content", ID);
    expect(meta.text).toBeUndefined();
  });

  it("falls back to ordinals.com, and returns null when nobody answers", async () => {
    stubSources({
      "static.unisat.io": () => new Response("down", { status: 503 }),
      "ordinals.com": () => new Response(null, { headers: { "content-type": "image/webp" } }),
    });
    expect((await getInscriptionMeta(ID.replace("i0", "i1")))?.contentType).toBe("image/webp");

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubSources({
      "static.unisat.io": () => new Response("down", { status: 503 }),
      // What Cloudflare's bot check sends Vercel's servers.
      "ordinals.com": () => new Response("<title>Just a moment...</title>", { status: 403 }),
    });
    expect(await getInscriptionMeta(ID.replace("i0", "i2"))).toBeNull();
    expect(warn.mock.calls[0]![0]).toContain("ordinals.com answered 403");
    expect(await getInscriptionMeta("not-an-id")).toBeNull();
  });
});
