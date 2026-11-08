import { describe, expect, it } from "vitest";
import {
  addDecimals,
  groupDigits,
  parseBrc20,
  previewFor,
  typeLabel,
  type InscriptionMeta,
} from "@/lib/inscriptionPreview";
import { SAMPLE_INSCRIPTIONS } from "@/lib/sample";

const meta = (m: Partial<InscriptionMeta>): InscriptionMeta => ({
  id: "a".repeat(64) + "i0",
  contentType: null,
  contentLength: null,
  ...m,
});

describe("BRC-20", () => {
  it("reads real transfer inscriptions", () => {
    // Text of inscription #126,063,442, as served by ordinals.com.
    expect(parseBrc20('{"p":"brc-20","op":"transfer","tick":"𝛑","amt":"10000000000"}')).toEqual({
      op: "transfer",
      tick: "𝛑",
      amount: "10000000000",
    });
    expect(parseBrc20('{"p":"brc-20","op":"mint","tick":"ordi","amt":"1000"}')?.op).toBe("mint");
    expect(parseBrc20('{"p":"brc-20","op":"deploy","tick":"ordi","max":"21000000","lim":"1000"}')).toEqual({
      op: "deploy",
      tick: "ordi",
      amount: "21000000",
    });
  });

  it("rejects text that only looks like BRC-20", () => {
    expect(parseBrc20("gm")).toBeNull();
    expect(parseBrc20("[1,2]")).toBeNull();
    expect(parseBrc20('{"p":"brc-20","op":"burn","tick":"ordi","amt":"1"}')).toBeNull();
    expect(parseBrc20('{"p":"brc-20","op":"transfer","tick":"toolong","amt":"1"}')).toBeNull();
    expect(parseBrc20('{"p":"brc-20","op":"transfer","tick":"ordi","amt":"-5"}')).toBeNull();
    expect(parseBrc20('{"p":"brc-20","op":"transfer","tick":"ordi","amt":1}')).toBeNull();
    expect(parseBrc20('{"p":"sns","op":"reg","name":"satoshi.sats"}')).toBeNull();
  });

  it("adds and formats amounts without losing precision", () => {
    expect(addDecimals("9676777776", "26000000000")).toBe("35676777776");
    expect(addDecimals("0.5", "1.25")).toBe("1.75");
    expect(addDecimals("99999999999999999999", "1")).toBe("100000000000000000000");
    expect(addDecimals("1.5", "1.5")).toBe("3");
    expect(groupDigits("10000000000")).toBe("10,000,000,000");
    expect(groupDigits("1234.5678")).toBe("1,234.5678");
    expect(groupDigits("12")).toBe("12");
  });
});

describe("previews", () => {
  it("shows raster images directly and small ones as pixel art", () => {
    expect(previewFor(meta({ contentType: "image/png", contentLength: 793 }))).toEqual({
      kind: "image",
      pixelated: true,
    });
    expect(previewFor(meta({ contentType: "image/webp", contentLength: 48_210 }))).toEqual({
      kind: "image",
      pixelated: false,
    });
  });

  it("uses the sandboxed frame for anything that could run code or load other inscriptions", () => {
    for (const t of ["text/html;charset=utf-8", "image/svg+xml", "video/mp4", "model/gltf-binary"]) {
      expect(previewFor(meta({ contentType: t, contentLength: 1000 })).kind).toBe("frame");
    }
    expect(previewFor(meta({ contentType: "image/png", delegate: "b".repeat(64) + "i0" })).kind).toBe("frame");
    expect(previewFor(null).kind).toBe("frame");
  });

  it("shows short text and turns BRC-20 text into a token card", () => {
    expect(previewFor(meta({ contentType: "text/plain", text: "gm" }))).toEqual({ kind: "text", text: "gm" });
    const p = previewFor(SAMPLE_INSCRIPTIONS["bf4c141c6b623d46983401133f7548206db434c46404286c814cf9db9e3685b2i0"]!);
    expect(p.kind).toBe("brc20");
    expect(typeLabel(p, "text/plain;charset=utf-8")).toBe("BRC-20 transfer");
  });

  it("labels content types in plain words", () => {
    const frame = { kind: "frame" } as const;
    expect(typeLabel(frame, "text/html;charset=utf-8")).toBe("HTML");
    expect(typeLabel(frame, "image/svg+xml")).toBe("SVG");
    expect(typeLabel(frame, "video/mp4")).toBe("Video (mp4)");
    expect(typeLabel(frame, null)).toBe("Inscription");
    expect(typeLabel({ kind: "image", pixelated: false }, "image/webp")).toBe("WEBP");
  });

  it("has sample details for every real inscription in the sample wallets", () => {
    const real = Object.values(SAMPLE_INSCRIPTIONS).filter((m) => m.text?.includes("brc-20"));
    expect(real.length).toBeGreaterThanOrEqual(16);
    for (const m of real) {
      expect(new TextEncoder().encode(m.text!).length).toBe(m.contentLength);
      expect(previewFor(m).kind).toBe("brc20");
    }
  });
});
