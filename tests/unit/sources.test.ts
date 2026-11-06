import { describe, expect, it } from "vitest";
import { mapEstimates, mapMempoolFees, mapStats, mapUtxo } from "@/lib/esplora";
import { buildOverlay } from "@/lib/unisat";
import { allowVisitor, resetBudgetsForTests, spendUnits } from "@/lib/budget";

describe("esplora mapping", () => {
  it("maps a UTXO", () => {
    expect(
      mapUtxo({
        txid: "ab",
        vout: 1,
        value: 546,
        status: { confirmed: true, block_height: 974_802, block_time: 1_793_961_236 },
      }),
    ).toEqual({
      txid: "ab",
      vout: 1,
      value: 546,
      confirmed: true,
      height: 974_802,
      time: 1_793_961_236,
      inscriptions: [],
      runes: [],
    });
  });

  it("adds mempool activity to chain stats", () => {
    const s = mapStats({
      chain_stats: { funded_txo_sum: 3_157_677, spent_txo_sum: 2_685_536, tx_count: 59 },
      mempool_stats: { funded_txo_sum: 314_701, spent_txo_sum: 315_315, tx_count: 4 },
    });
    expect(s).toEqual({ txCount: 63, receivedSats: 3_472_378, sentSats: 3_000_851, pendingTxCount: 4 });
  });

  it("maps mempool.space fee tiers", () => {
    expect(mapMempoolFees({ fastestFee: 3, halfHourFee: 2, hourFee: 1, economyFee: 1, minimumFee: 1 })).toEqual({
      fastest: 3,
      halfHour: 2,
      hour: 1,
      economy: 1,
      minimum: 1,
    });
  });

  it("maps blockstream fee estimates, including sub-1 sat/vB rates", () => {
    // Real values from blockstream.info, 2026-11-06.
    const f = mapEstimates({
      "1": 0.274,
      "2": 0.274,
      "3": 0.274,
      "6": 0.12,
      "25": 0.12,
      "144": 0.113,
      "504": 0.1,
      "1008": 0.09999999999999999,
    });
    expect(f).toEqual({ fastest: 0.27, halfHour: 0.27, hour: 0.12, economy: 0.11, minimum: 0.1 });
  });
});

describe("UniSat overlay", () => {
  it("indexes inscriptions and runes by outpoint", () => {
    const o = buildOverlay(
      [{ txid: "aa", vout: 0, satoshi: 546, inscriptions: [{ inscriptionId: "aai0", inscriptionNumber: 7 }] }],
      [
        {
          amount: "100",
          runeid: "840000:3",
          rune: "DOGGOTOTHEMOON",
          spacedRune: "DOG•GO•TO•THE•MOON",
          symbol: "🐕",
          divisibility: 5,
        },
      ],
      [
        [
          {
            txid: "bb",
            vout: 1,
            satoshi: 546,
            runes: [
              {
                amount: "100",
                runeid: "840000:3",
                rune: "DOGGOTOTHEMOON",
                spacedRune: "DOG•GO•TO•THE•MOON",
                symbol: "🐕",
                divisibility: 5,
              },
            ],
          },
        ],
        // The same coin listed again under another rune query must not duplicate.
        [
          {
            txid: "bb",
            vout: 1,
            satoshi: 546,
            runes: [
              {
                amount: "100",
                runeid: "840000:3",
                rune: "DOGGOTOTHEMOON",
                spacedRune: "DOG•GO•TO•THE•MOON",
                symbol: "🐕",
                divisibility: 5,
              },
            ],
          },
        ],
      ],
    );
    expect(o.inscriptions["aa:0"]).toEqual([{ id: "aai0", number: 7 }]);
    expect(o.runes["bb:1"]).toHaveLength(1);
    expect(o.runes["bb:1"]![0]!.name).toBe("DOG•GO•TO•THE•MOON");
    expect(o.balances[0]!.id).toBe("840000:3");
  });
});

describe("budgets", () => {
  it("stops at the daily UniSat budget and resets the next day", () => {
    resetBudgetsForTests();
    const t = Date.now();
    let ok = 0;
    while (spendUnits(1, t)) ok++;
    expect(ok).toBe(900);
    expect(spendUnits(1, t + 86_400_001)).toBe(true);
  });

  it("limits one visitor per window", () => {
    resetBudgetsForTests();
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) expect(allowVisitor("ip", t, 3, 1000)).toBe(true);
    expect(allowVisitor("ip", t, 3, 1000)).toBe(false);
    expect(allowVisitor("other", t, 3, 1000)).toBe(true);
    expect(allowVisitor("ip", t + 1001, 3, 1000)).toBe(true);
  });
});
