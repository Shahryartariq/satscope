import { describe, expect, it } from "vitest";
import vm from "node:vm";
import { analyticsPage, analyticsReferrer, gaBootScript } from "@/lib/analytics";

describe("analytics page", () => {
  it("never sends an address", () => {
    expect(
      analyticsPage(
        "/address/bc1pcs8fplulfdqazg4cnds39ssp6ydfxdf5mrvl768pnd79l9ledwgqk4z74m",
        "Wallet checkup for bc1pcs8f…z74m",
      ),
    ).toEqual({
      path: "/address/:address",
      title: "Wallet checkup",
    });
    expect(analyticsPage("/wallet?o=bc1p…&p=bc1q…", "Wallet checkup")).toEqual({
      path: "/wallet",
      title: "Wallet checkup",
    });
    expect(analyticsPage("/verify", "Proof for bc1q…").title).toBe("Wallet checkup");
  });

  it("keeps ordinary pages as they are", () => {
    expect(analyticsPage("/learn/ordinals-safety", "Keep inscriptions safe")).toEqual({
      path: "/learn/ordinals-safety",
      title: "Keep inscriptions safe",
    });
    expect(analyticsPage("", "Satscope").path).toBe("/");
  });
});

describe("analyticsReferrer", () => {
  const origin = "https://satscope.vercel.app";
  it("never passes on an address, proof or query string", () => {
    expect(analyticsReferrer(`${origin}/address/bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq`, origin)).toBe(
      `${origin}/address/:address`,
    );
    expect(analyticsReferrer(`${origin}/verify?p=abc&a=bc1q`, origin)).toBe(`${origin}/verify`);
    expect(analyticsReferrer("https://news.example.com/story?id=9", origin)).toBe("https://news.example.com");
    expect(analyticsReferrer("", origin)).toBe("");
  });
});

describe("gaBootScript", () => {
  function run(pathname: string, referrer: string, title: string) {
    const ctx: Record<string, unknown> = {
      location: { pathname, origin: "https://satscope.vercel.app" },
      document: { referrer, title },
      URL,
      Date,
    };
    ctx.window = ctx;
    vm.runInNewContext(gaBootScript("G-TEST1234"), ctx);
    const calls = (ctx.dataLayer as IArguments[]).map((a) => Array.from(a));
    return calls.find((c) => c[0] === "config")!;
  }

  it("runs, and tells GA nothing about the address", () => {
    const [, id, params] = run(
      "/address/bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
      "https://satscope.vercel.app/verify?p=secret",
      "Wallet checkup for bc1qar…5mdq",
    );
    expect(id).toBe("G-TEST1234");
    expect(params).toEqual({
      page_location: "https://satscope.vercel.app/address/:address",
      page_path: "/address/:address",
      page_referrer: "https://satscope.vercel.app/verify",
      page_title: "Wallet checkup",
    });
  });

  it("keeps ordinary page titles and reduces outside referrers to their origin", () => {
    const [, , params] = run("/learn", "https://news.example.com/a?b=c", "Guides | Satscope");
    expect(params).toMatchObject({
      page_path: "/learn",
      page_referrer: "https://news.example.com",
      page_title: "Guides | Satscope",
    });
  });
});
