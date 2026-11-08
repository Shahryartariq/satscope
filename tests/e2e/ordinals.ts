import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";

const PNG = readFileSync(join(__dirname, "../fixtures/inscription.png"));
const PREVIEW = `<!doctype html><html lang="en"><head><title>Inscription preview</title></head><body style="margin:0;background:#111"><p style="color:#fff;font:16px sans-serif;padding:12px">Preview</p></body></html>`;

/** Serves ordinals.com images and preview pages locally so tests never touch the network. */
export async function stubOrdinals(page: Page): Promise<{ requests: string[] }> {
  const requests: string[] = [];
  await page.route("https://ordinals.com/**", async (route) => {
    const url = route.request().url();
    requests.push(url);
    if (url.includes("/content/")) return route.fulfill({ status: 200, contentType: "image/png", body: PNG });
    if (url.includes("/preview/")) return route.fulfill({ status: 200, contentType: "text/html", body: PREVIEW });
    return route.fulfill({ status: 404, body: "" });
  });
  return { requests };
}
