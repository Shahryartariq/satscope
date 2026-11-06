import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const SMALL = "bc1pvep9uh9smsr3xln4lql5xx53lmnfm2pxyr3pxvg7anpvu73zz9fqmf8rk3";
const PAYMENT = "bc1q80z72mugw2g52utqgd5y9audpae4ghp8atmthm";
const LEGACY = "1MVP92Tsqt6ceXzwPAT5vaiQgQToxCwH93";
const COLLECTOR = "bc1pcs8fplulfdqazg4cnds39ssp6ydfxdf5mrvl768pnd79l9ledwgqk4z74m";
const VECTOR = {
  a: "bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l",
  m: "Hello World",
  s: "AkcwRAIgZRfIY3p7/DoVTty6YZbWS71bc5Vct9p9Fia83eRmw2QCICK/ENGfwLtptFluMGs2KsqoNSk89pO7F29zJLUx9a/sASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViHI=",
};

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

test.describe("home", () => {
  test("explains the tool and validates input", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Bitcoin wallet");
    const input = page.getByLabel("Bitcoin address");
    await page.getByRole("button", { name: "Check wallet" }).click();
    await expect(page.locator(".form-error")).toContainText("Paste a Bitcoin address first");
    await input.fill("tb1q9vza2e8x573nczrlzms0wvx3gsqjx7vaxwd45v");
    await page.getByRole("button", { name: "Check wallet" }).click();
    await expect(page.locator(".form-error")).toContainText("testnet");
    await input.fill("bc1qnotreal");
    await page.getByRole("button", { name: "Check wallet" }).click();
    await expect(page.locator(".form-error")).toContainText("doesn't look like a Bitcoin address");
    await input.fill(`  ${SMALL.toUpperCase()}  `);
    await page.getByRole("button", { name: "Check wallet" }).click();
    await expect(page).toHaveURL(new RegExp(`/address/${SMALL}$`));
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Checkup for bc1pve");
    expect(errors).toEqual([]);
  });

  test("example link opens a real wallet report", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /bc1pcs8f/ }).click();
    await expect(page).toHaveURL(new RegExp(COLLECTOR));
    await expect(page.getByText("13 coins").first()).toBeVisible();
  });
});

test.describe("reports", () => {
  test("wallet with inscriptions in the payment address", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(`/wallet?o=${SMALL}&p=${PAYMENT}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wallet checkup");
    await expect(page.getByText("Payment address", { exact: true }).first()).toBeVisible();
    const findings = page.locator(".finding");
    await expect(findings.first()).toContainText("High risk");
    await expect(findings.first()).toContainText("3 inscriptions in your payment address");
    await expect(page.getByRole("img", { name: /Wallet health 0 out of 100, grade F/ })).toBeVisible();
    // Every coin on the map links to its table row.
    const coinLinks = page.locator(".coin-map a");
    await expect(coinLinks).toHaveCount(21);
    const first = coinLinks.first();
    const href = await first.getAttribute("href");
    await first.focus();
    await expect(page.locator(".hover-label").last()).toContainText("sats");
    await first.click();
    await expect(page.locator(href!)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Runes", exact: true })).toBeVisible();
    await expect(page.getByText("DOG•GO•TO•THE•MOON").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Merging your spendable coins" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("clean Taproot wallet gets an A", async ({ page }) => {
    await page.goto(`/address/${SMALL}`);
    await expect(page.getByRole("img", { name: /grade A/ })).toBeVisible();
    await expect(page.getByText("Nothing to fix")).toBeVisible();
  });

  test("is honest when Ordinals data is missing", async ({ page }) => {
    await page.goto(`/address/${LEGACY}`);
    await expect(page.getByRole("status").filter({ hasText: "weren't checked" })).toBeVisible();
    await expect(page.getByText("Legacy address", { exact: true })).toBeVisible();
    await expect(page.getByText("Check first (likely inscription postage)").first()).toBeVisible();
  });

  test("rejects a bad address", async ({ page }) => {
    await page.goto("/address/bc1qnotarealaddress");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("That address isn't recognised");
  });

  test("finding coin lists jump to the coin table", async ({ page }) => {
    await page.goto(`/address/${PAYMENT}`);
    const finding = page.locator(".finding").filter({ hasText: "inscriptions in this address" });
    await finding.getByText(/Show the/).click();
    await finding.locator("a.mono").first().click();
    await expect(page.locator("tr:target")).toHaveCount(1);
  });
});

test.describe("proofs", () => {
  test("verifies a BIP-322 signature from the form and makes a share link", async ({ page }) => {
    await page.goto("/verify");
    await page.getByLabel("Bitcoin address").fill(VECTOR.a);
    await page.getByLabel("Message, exactly as signed").fill(VECTOR.m);
    await page.getByLabel("Signature").fill(VECTOR.s);
    await page.getByRole("button", { name: "Verify signature" }).click();
    await expect(page.getByText("Signature is valid")).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy proof link" })).toBeVisible();
  });

  test("rejects a changed message", async ({ page }) => {
    await page.goto(`/verify?a=${VECTOR.a}&m=${encodeURIComponent("Hello World!")}&s=${encodeURIComponent(VECTOR.s)}`);
    await expect(page.getByText("Signature is not valid")).toBeVisible();
  });

  test("explains a damaged proof link", async ({ page }) => {
    await page.goto("/verify?p=abc");
    await expect(page.locator(".form-error")).toContainText("damaged");
  });

  test("wallet list loads LaserEyes and offers wallets to install", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/prove");
    await page.getByRole("button", { name: "Connect wallet" }).click();
    const dialog = page.getByRole("dialog", { name: "Connect a Bitcoin wallet" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("No Bitcoin wallet found")).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByRole("link", { name: /Xverse/ })).toBeVisible();
    await expect(dialog.getByRole("link", { name: /UniSat/ })).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
    expect(errors.filter((e) => !/favicon/.test(e))).toEqual([]);
  });
});

test.describe("site", () => {
  test("remembers the chosen theme without a flash", async ({ page }) => {
    await page.goto("/");
    await page.locator('label[for="theme-dark"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.locator('label[for="theme-system"]').click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /./);
  });

  test("sends security headers", async ({ request }) => {
    const res = await request.get("/");
    const csp = res.headers()["content-security-policy"] ?? "";
    expect(csp).toContain("script-src 'self' 'nonce-");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("SEO basics", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https?:\/\/[^/]+\/?$/);
    expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThan(0);
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /address/");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/learn/protect-inscriptions");
    expect(sitemap).not.toContain("/address/");
    await page.goto(`/address/${SMALL}`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    expect((await request.get("/opengraph-image")).headers()["content-type"]).toContain("image/png");
  });

  test("guides render", async ({ page }) => {
    await page.goto("/learn");
    await page.getByRole("link", { name: /keep your Ordinals/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Ordinals");
    expect((await page.request.get("/learn/not-a-guide")).status()).toBe(404);
  });
});

for (const scheme of ["light", "dark"] as const) {
  test.describe(`accessibility (${scheme})`, () => {
    test.use({ colorScheme: scheme });
    for (const path of [
      "/",
      `/wallet?o=${SMALL}&p=${PAYMENT}`,
      `/address/${LEGACY}`,
      "/prove",
      "/verify",
      "/learn/utxo-consolidation",
    ]) {
      test(path, async ({ page }) => {
        await page.goto(path);
        await expectAccessible(page);
      });
    }
  });
}
