import { describe, expect, it } from "vitest";
import { buildReport, classifyCoin, gradeFor } from "@/lib/analyze";
import {
  SAMPLE_COLLECTOR,
  SAMPLE_LEGACY,
  SAMPLE_MARKET,
  SAMPLE_PAYMENT,
  SAMPLE_SMALL,
  SAMPLE_SNAPSHOTS,
} from "@/lib/sample";
import type { AddressSnapshot, MarketData } from "@/lib/types";

const get = (a: string, role: AddressSnapshot["role"] = "single"): AddressSnapshot => ({
  ...SAMPLE_SNAPSHOTS[a]!,
  role,
});
const ids = (r: ReturnType<typeof buildReport>) => r.findings.map((f) => f.id);

describe("classifyCoin", () => {
  const snap = get(SAMPLE_PAYMENT);
  it("labels inscriptions, runes and both", () => {
    const kinds = snap.coins.map((c) => classifyCoin(c, snap, 1).kind);
    expect(kinds).toContain("inscribed");
    expect(kinds).toContain("runic");
    expect(kinds).toContain("mixed");
  });

  it("marks coins that cost more to spend than they hold", () => {
    const coin = { ...snap.coins[0]!, value: 500 };
    expect(classifyCoin(coin, snap, 10).kind).toBe("uneconomical"); // 68 vB × 10 = 680 > 500
    expect(classifyCoin(coin, snap, 1).kind).toBe("clean");
  });

  it("is careful with postage-sized coins when no index answered", () => {
    const legacy = get(SAMPLE_LEGACY);
    const tiny = legacy.coins.find((c) => c.value === 546)!;
    expect(classifyCoin(tiny, legacy, 0.5).kind).toBe("unverified");
  });
});

describe("buildReport", () => {
  it("raises the alarm for inscriptions and runes in a payment address", () => {
    const r = buildReport([get(SAMPLE_SMALL, "ordinals"), get(SAMPLE_PAYMENT, "payment")], SAMPLE_MARKET);
    const top = r.findings[0]!;
    expect(top.severity).toBe("high");
    expect(ids(r)).toEqual(
      expect.arrayContaining([
        "inscriptions-in-payment",
        "runes-in-payment",
        "heavy-inscriptions",
        "stacked-inscriptions",
        "mixed-assets",
        "fragmented",
      ]),
    );
    const pay = r.findings.find((f) => f.id === "inscriptions-in-payment")!;
    expect(pay.address).toBe(SAMPLE_PAYMENT);
    expect(pay.title).toBe("3 inscriptions in your payment address");
    expect(r.score).toBeLessThan(40);
    expect(r.grade).toBe("F");
  });

  it("treats inscriptions in a Taproot address as normal", () => {
    const r = buildReport([get(SAMPLE_SMALL)], SAMPLE_MARKET);
    expect(ids(r)).not.toContain("inscriptions-in-payment");
    expect(r.totals.inscriptions).toBe(3);
    expect(r.totals.protectedSats).toBe(546 + 546 + 330);
    expect(r.totals.spendableSats).toBe(9362);
    expect(r.score).toBe(100);
    expect(r.grade).toBe("A");
  });

  it("flags inscriptions in a single SegWit address as medium", () => {
    const r = buildReport([get(SAMPLE_PAYMENT)], SAMPLE_MARKET);
    expect(r.findings.find((f) => f.id === "inscriptions-in-payment")!.severity).toBe("medium");
  });

  it("reports pending coins and address reuse on the real collector wallet", () => {
    const r = buildReport([get(SAMPLE_COLLECTOR)], SAMPLE_MARKET);
    expect(ids(r)).toContain("unconfirmed");
    expect(ids(r)).toContain("address-reuse");
    expect(r.totals.coins).toBe(22);
    expect(r.totals.inscriptions).toBe(13);
    expect(r.coins[0]!.value).toBe(167_123); // sorted by value
  });

  it("is honest when Ordinals data is missing", () => {
    const r = buildReport([get(SAMPLE_LEGACY)], SAMPLE_MARKET);
    expect(r.indexed).toBe(false);
    expect(ids(r)).toEqual(expect.arrayContaining(["not-indexed", "legacy-address", "address-reuse"]));
    const ni = r.findings.find((f) => f.id === "not-indexed")!;
    expect(ni.severity).toBe("low");
    expect(ni.coins).toHaveLength(1);
  });

  it("costs a consolidation at today's and a busy day's rate", () => {
    const r = buildReport([get(SAMPLE_PAYMENT, "payment")], SAMPLE_MARKET);
    const c = r.consolidation!;
    expect(c.coinCount).toBe(14);
    expect(c.vbytes).toBe(Math.ceil(10.5 + 14 * 68 + 31));
    expect(c.costNow).toBe(Math.ceil(c.vbytes * 0.5));
    expect(c.rateBusy).toBe(20);
    expect(c.costBusy).toBe(c.vbytes * 20);
  });

  it("finds uneconomical coins when fees are high", () => {
    const busy: MarketData = {
      ...SAMPLE_MARKET,
      fees: { fastest: 40, halfHour: 30, hour: 25, economy: 12, minimum: 5 },
    };
    const r = buildReport([get(SAMPLE_SMALL)], busy);
    // The only clean coin is 9,362 sats; 57.5 vB × 12 = 690 sats, still economical.
    expect(ids(r)).not.toContain("uneconomical");
    const r2 = buildReport([get(SAMPLE_LEGACY)], busy);
    expect(r2.coins.find((c) => c.value === 546)!.kind).toBe("unverified");
  });

  it("handles an empty address", () => {
    const empty: AddressSnapshot = {
      ...get(SAMPLE_SMALL),
      coins: [],
      stats: { txCount: 0, receivedSats: 0, sentSats: 0, pendingTxCount: 0 },
    };
    const r = buildReport([empty], SAMPLE_MARKET);
    expect(r.totals.sats).toBe(0);
    expect(r.findings).toHaveLength(0);
    expect(r.score).toBe(100);
  });
});

describe("gradeFor", () => {
  it.each([
    [100, "A"],
    [90, "A"],
    [89, "B"],
    [60, "C"],
    [40, "D"],
    [39, "F"],
  ])("%i → %s", (score, grade) => expect(gradeFor(score)).toBe(grade));
});
