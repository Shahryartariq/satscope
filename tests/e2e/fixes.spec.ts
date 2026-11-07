import ecc from "@bitcoinerlab/secp256k1";
import { address, crypto, initEccLib, networks, Psbt, toXOnly, Transaction } from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import { expect, test, type Page } from "@playwright/test";

/**
 * End-to-end test of the one-click fixes with a mock Leather wallet that really
 * signs. The wallet's key is the public BIP-322 test key, and the broadcast is
 * intercepted, so nothing reaches the Bitcoin network.
 */

initEccLib(ecc);
const ECPair = ECPairFactory(ecc);
const key = ECPair.fromWIF("L3VFeEujGtevx9w18HD1fhRbCH67Az2dpCymeRE1SoPK6XQtaN2k");
const tweaked = key.tweak(crypto.taggedHash("TapTweak", toXOnly(key.publicKey)));
const PUB = Buffer.from(key.publicKey).toString("hex");
const PAY = "bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l";
const ORD = "bc1ppv609nr0vr25u07u95waq5lucwfm6tde4nydujnu8npg4q75mr5sxq8lt3";

function signLikeAWallet(hex: string): string {
  const psbt = Psbt.fromHex(hex, { network: networks.bitcoin });
  psbt.data.inputs.forEach((input, i) => psbt.signInput(i, input.tapInternalKey ? tweaked : key));
  return psbt.toHex(); // Leather returns it unfinalised; Satscope finalises.
}

async function installMockWallet(page: Page): Promise<{ broadcasts: string[] }> {
  const broadcasts: string[] = [];
  await page.exposeFunction("__mockSignPsbt", signLikeAWallet);
  await page.addInitScript(
    ({ pay, ord, pub }) => {
      (window as unknown as Record<string, unknown>).LeatherProvider = {
        async request(method: string, params: { hex?: string }) {
          if (method === "getAddresses") {
            return {
              result: {
                addresses: [
                  { symbol: "BTC", type: "p2wpkh", address: pay, publicKey: pub },
                  { symbol: "BTC", type: "p2tr", address: ord, publicKey: pub },
                ],
              },
            };
          }
          if (method === "signPsbt") {
            const sign = (window as unknown as { __mockSignPsbt: (h: string) => Promise<string> }).__mockSignPsbt;
            return { result: { hex: await sign(params.hex!) } };
          }
          throw new Error(`mock wallet: ${method} not supported`);
        },
      };
    },
    { pay: PAY, ord: ORD, pub: PUB },
  );
  await page.route("https://mempool.space/api/tx", async (route) => {
    const hex = route.request().postData() ?? "";
    broadcasts.push(hex);
    await route.fulfill({ status: 200, contentType: "text/plain", body: Transaction.fromHex(hex).getId() });
  });
  return { broadcasts };
}

function outputs(hex: string) {
  return Transaction.fromHex(hex).outs.map((o) => ({
    address: address.fromOutputScript(o.script, networks.bitcoin),
    value: Number(o.value),
  }));
}

test.describe("one-click fixes", () => {
  test("moves an inscription and Runes out of the payment address", async ({ page }) => {
    const { broadcasts } = await installMockWallet(page);
    await page.goto(`/wallet?o=${ORD}&p=${PAY}`);
    const panel = page.locator(".fix-panel");
    const move = panel.locator(".fix-move");
    await expect(move).toContainText("Move 1 inscription and Runes on 1 coin to your Ordinals address");
    await move.getByRole("button", { name: "Review the move" }).click();

    const dialog = page.getByRole("dialog", { name: "Connect a Bitcoin wallet" });
    await dialog.getByRole("button", { name: /Leather/ }).click({ timeout: 15_000 });

    const spent = panel.locator("table").first().locator("tbody tr");
    await expect(spent).toHaveCount(3);
    // The Runes-only coin goes first, so its Runes stay off the inscription.
    await expect(spent.nth(0)).toContainText("DOG•GO•TO•THE•MOON");
    await expect(spent.nth(1)).toContainText("1 inscription");
    await expect(spent.nth(2)).toContainText("pays the fee");
    const created = panel.locator("table").nth(1).locator("tbody tr");
    await expect(created.nth(0)).toContainText("Your Ordinals address");
    await expect(created.nth(2)).toContainText("Your payment address");

    const signButton = panel.getByRole("button", { name: "Sign in your wallet" });
    await expect(signButton).toBeDisabled();
    await panel.getByText("No rush").click();
    await panel.getByRole("checkbox").check();
    await signButton.click();
    await expect(panel.getByText("Signed, and it matches what you reviewed")).toBeVisible();
    expect(broadcasts).toHaveLength(0); // nothing is sent before the second click
    await panel.getByRole("button", { name: "Send to the network" }).click();
    await expect(panel.getByText("Sent to the network")).toBeVisible();

    expect(broadcasts).toHaveLength(1);
    const outs = outputs(broadcasts[0]!);
    expect(outs.slice(0, 2)).toEqual([
      { address: ORD, value: 546 },
      { address: ORD, value: 546 },
    ]);
    expect(outs[2]!.address).toBe(PAY);
    const txid = Transaction.fromHex(broadcasts[0]!).getId();
    await expect(panel.getByRole("link", { name: "Track it on mempool.space" })).toHaveAttribute(
      "href",
      `https://mempool.space/tx/${txid}`,
    );
  });

  test("merges plain coins and leaves inscriptions alone", async ({ page }) => {
    const { broadcasts } = await installMockWallet(page);
    await page.goto(`/address/${PAY}`);
    const panel = page.locator(".fix-panel");
    await panel.locator(".fix-merge").getByRole("button", { name: "Review the merge" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /Leather/ })
      .click({ timeout: 15_000 });
    await expect(panel.locator("table").first().locator("tbody tr")).toHaveCount(6);
    await panel.getByRole("checkbox").check();
    await panel.getByRole("button", { name: "Sign in your wallet" }).click();
    await panel.getByRole("button", { name: "Send to the network" }).click();
    await expect(panel.getByText("Sent to the network")).toBeVisible();
    const outs = outputs(broadcasts[0]!);
    expect(outs).toHaveLength(1);
    expect(outs[0]!.address).toBe(PAY);
    const tx = Transaction.fromHex(broadcasts[0]!);
    expect(tx.ins).toHaveLength(6);
  });

  test("refuses a wallet that doesn't own the address", async ({ page }) => {
    await installMockWallet(page);
    await page.goto("/address/bc1q80z72mugw2g52utqgd5y9audpae4ghp8atmthm");
    const panel = page.locator(".fix-panel");
    await panel.locator(".fix-merge").getByRole("button", { name: "Review the merge" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /Leather/ })
      .click({ timeout: 15_000 });
    await expect(panel.getByRole("alert")).toContainText("Connect the wallet that owns");
  });

  test("offers no fixes when the Ordinals index didn't answer", async ({ page }) => {
    await page.goto("/address/1MVP92Tsqt6ceXzwPAT5vaiQgQToxCwH93");
    await expect(page.getByText("Fixes need the Ordinals index")).toBeVisible();
  });
});
