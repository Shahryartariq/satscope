import { describe, expect, it } from "vitest";
import {
  formatBtc,
  formatCount,
  formatRate,
  formatRuneAmount,
  formatSats,
  formatUsd,
  relativeTime,
} from "@/lib/format";
import { inputCost, sweepVbytes } from "@/lib/fees";

describe("format", () => {
  it("formats BTC without scientific notation", () => {
    expect(formatBtc(0)).toBe("0 BTC");
    expect(formatBtc(546)).toBe("0.00000546 BTC");
    expect(formatBtc(100_000_000)).toBe("1 BTC");
    expect(formatBtc(123_450_000)).toBe("1.2345 BTC");
  });

  it("formats sats and counts", () => {
    expect(formatSats(1234567)).toBe("1,234,567 sats");
    expect(formatCount(1, "coin")).toBe("1 coin");
    expect(formatCount(3, "coin")).toBe("3 coins");
  });

  it("formats USD", () => {
    expect(formatUsd(100_000_000, 96_000)).toBe("$96,000");
    expect(formatUsd(546, 96_000)).toBe("$0.52");
    expect(formatUsd(1, 96_000)).toBe("< $0.01");
    expect(formatUsd(546, null)).toBeNull();
  });

  it("keeps sub-1 sat/vB rates readable", () => {
    expect(formatRate(0.113)).toBe("0.11 sat/vB");
    expect(formatRate(2.5)).toBe("2.5 sat/vB");
    expect(formatRate(23.7)).toBe("24 sat/vB");
  });

  it("formats rune amounts with divisibility and big numbers", () => {
    expect(formatRuneAmount("4200000", 5)).toBe("42");
    expect(formatRuneAmount("4200001", 5)).toBe("42.00001");
    expect(formatRuneAmount("5", 2)).toBe("0.05");
    expect(formatRuneAmount("100000000000000000000", 0)).toBe("100,000,000,000,000,000,000");
  });

  it("describes time", () => {
    const now = 1_800_000_000_000;
    expect(relativeTime(now / 1000 - 120, now)).toBe("2 min ago");
    expect(relativeTime(now / 1000 - 3 * 86_400, now)).toBe("3 days ago");
  });
});

describe("fees", () => {
  it("prices one input", () => {
    expect(inputCost("p2tr", 1)).toBe(58);
    expect(inputCost("p2pkh", 10)).toBe(1480);
    expect(inputCost("p2wpkh", 0.11)).toBe(8);
  });

  it("sizes a sweep transaction", () => {
    // 10.5 + 10 × 68 + 31 = 721.5 → 722
    expect(sweepVbytes([{ type: "p2wpkh", count: 10 }], "p2wpkh")).toBe(722);
    expect(
      sweepVbytes(
        [
          { type: "p2tr", count: 2 },
          { type: "p2pkh", count: 1 },
        ],
        "p2tr",
      ),
    ).toBe(Math.ceil(10.5 + 115 + 148 + 43));
  });
});
