import { expect, test } from "@playwright/test";
import { stubOrdinals } from "./ordinals";

const COLLECTOR = "bc1pcs8fplulfdqazg4cnds39ssp6ydfxdf5mrvl768pnd79l9ledwgqk4z74m";
const PAYMENT = "bc1q80z72mugw2g52utqgd5y9audpae4ghp8atmthm";
const TEST_PAY = "bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l";
const TEST_ORD = "bc1ppv609nr0vr25u07u95waq5lucwfm6tde4nydujnu8npg4q75mr5sxq8lt3";

test.describe("inscription gallery", () => {
  test("shows BRC-20 transfer inscriptions as token cards with a total", async ({ page }) => {
    await stubOrdinals(page);
    await page.goto(`/address/${COLLECTOR}`);
    const gallery = page.locator(".gallery");
    await expect(gallery.getByRole("heading", { name: "Inscriptions" })).toBeVisible();
    const tiles = gallery.locator(".ins-tile");
    // The first 8 show straight away; the rest sit behind "Show 5 more".
    await expect(tiles.filter({ visible: true })).toHaveCount(8);
    await gallery.getByText("Show 5 more").click();
    await expect(tiles).toHaveCount(13);
    await expect(tiles.filter({ visible: true })).toHaveCount(13);
    await expect(tiles.locator(".brc20")).toHaveCount(13);
    // Real inscription #126,063,442 holds 10,000,000,000 𝛑.
    const tile = tiles.filter({ hasText: "#126,063,442" });
    await expect(tile.locator(".brc20-amt")).toHaveText("10,000,000,000");
    await expect(tile.locator(".ins-type")).toHaveText("BRC-20 transfer");
    await expect(tile.getByRole("link", { name: "#126,063,442" })).toHaveAttribute(
      "href",
      "https://ordinals.com/inscription/bf4c141c6b623d46983401133f7548206db434c46404286c814cf9db9e3685b2i0",
    );
    // The 13 transfers add up exactly (BigInt maths, no rounding).
    await expect(gallery.locator(".brc20-summary")).toContainText("121,624,055,557 𝛑 on 13 inscriptions");
    // Each tile links to its coin in the table.
    await tile.getByRole("link", { name: "on a 330-sat coin" }).click();
    await expect(page.locator("tr:target")).toContainText("330");
  });

  test("draws images, text and other content, at-risk coins first", async ({ page }) => {
    const { requests } = await stubOrdinals(page);
    await page.goto(`/wallet?o=${TEST_ORD}&p=${TEST_PAY}`);
    const tiles = page.locator(".gallery .ins-tile");
    await expect(tiles).toHaveCount(3);
    await expect(tiles.first()).toHaveClass(/at-risk/);
    await expect(tiles.first()).toContainText("In payment address");
    await expect(tiles.first().locator(".ins-text")).toContainText("fourth halving");
    await expect(tiles.nth(1).locator("iframe")).toHaveAttribute("sandbox", "allow-scripts");
    await expect(tiles.nth(1).locator(".ins-type")).toHaveText("HTML");
    const img = tiles.nth(2).locator("img");
    await expect(img).toHaveAttribute("alt", "Inscription #103,000,042");
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    await expect(page.getByRole("link", { name: "All in your payment address" })).toHaveAttribute(
      "href",
      `https://ordinals.com/address/${TEST_PAY}`,
    );
    // Only content requests go to ordinals.com from the browser; details come from the server.
    expect(requests.every((u) => /\/(content|preview)\//.test(u))).toBe(true);
  });

  test("small images are drawn as pixel art", async ({ page }) => {
    await stubOrdinals(page);
    await page.goto(`/address/${PAYMENT}`);
    const img = page.locator(".gallery img").first();
    await expect(img).toHaveClass(/pixel/);
    await expect(page.locator(".gallery .brc20-tick")).toHaveText("ordi");
  });
});
