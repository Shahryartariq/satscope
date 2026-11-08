import { describe, expect, it } from "vitest";
import { analyticsPage } from "@/lib/analytics";

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
