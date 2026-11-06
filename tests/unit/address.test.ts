import { describe, expect, it } from "vitest";
import { looksLikeTestnet, normalizeAddress, parseAddress, shortAddress } from "@/lib/address";

describe("parseAddress", () => {
  it.each([
    ["bc1pcs8fplulfdqazg4cnds39ssp6ydfxdf5mrvl768pnd79l9ledwgqk4z74m", "p2tr"],
    ["bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l", "p2wpkh"],
    ["BC1Q9VZA2E8X573NCZRLZMS0WVX3GSQJX7VAVGKX0L", "p2wpkh"],
    ["bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3", "p2wsh"],
    ["1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "p2pkh"],
    ["37qyp7jQAzqb2rCBpMvVtLDuuzKAUCVnJb", "p2sh"],
  ])("recognises %s as %s", (addr, type) => {
    expect(parseAddress(addr)).toBe(type);
  });

  it.each([
    "",
    "hello",
    "bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0m", // bad checksum
    "bc1Q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l", // mixed case
    "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNb", // bad base58 checksum
    "tb1q9vza2e8x573nczrlzms0wvx3gsqjx7vaxwd45v", // testnet
    "bc1zw508d6qejxtdg4y5r3zarvaryvaxxpcs", // version 2 (unknown)
    // Taproot program encoded with bech32 instead of bech32m
    "bc1pw508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7kt5nd6y",
  ])("rejects %s", (addr) => {
    expect(parseAddress(addr)).toBeNull();
  });

  it("trims whitespace", () => {
    expect(parseAddress("  1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa \n")).toBe("p2pkh");
  });
});

describe("helpers", () => {
  it("lowercases bech32 only", () => {
    expect(normalizeAddress(" BC1Q9VZA2E8X573NCZRLZMS0WVX3GSQJX7VAVGKX0L ")).toBe(
      "bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l",
    );
    expect(normalizeAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toBe("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
  });

  it("spots testnet addresses", () => {
    expect(looksLikeTestnet("tb1q9vza2e8x573nczrlzms0wvx3gsqjx7vaxwd45v")).toBe(true);
    expect(looksLikeTestnet("bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l")).toBe(false);
  });

  it("shortens long addresses", () => {
    expect(shortAddress("bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l")).toBe("bc1q9v…vgkx0l");
    expect(shortAddress("short")).toBe("short");
  });
});
