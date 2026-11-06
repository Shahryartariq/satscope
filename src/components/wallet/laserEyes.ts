"use client";

import type { LaserEyesClient, ProviderType } from "@omnisat/lasereyes-core";

/**
 * Thin wrapper around LaserEyes (https://github.com/omnisat/lasereyes-mono).
 * The library is large, so it is loaded only when someone opens the wallet list.
 */

export interface WalletOption {
  id: ProviderType;
  name: string;
  url: string;
  installed: boolean;
}

export interface Connected {
  provider: ProviderType;
  /** Ordinals (usually Taproot) address. */
  address: string;
  /** Payment address; the same as `address` in single-address wallets. */
  paymentAddress: string;
}

const NAMES: Partial<Record<string, string>> = {
  xverse: "Xverse",
  unisat: "UniSat",
  leather: "Leather",
  "magic-eden": "Magic Eden",
  okx: "OKX Wallet",
  phantom: "Phantom",
  oyl: "Oyl",
  wizz: "Wizz",
  orange: "Orange",
  tokeo: "Tokeo",
  binance: "Binance Web3",
  keplr: "Keplr",
  op_net: "OP_WALLET",
  sparrow: "Sparrow",
};

/** Wallets listed first, in this order, when installed or not. */
const PREFERRED = ["xverse", "unisat", "leather", "magic-eden", "okx", "phantom", "oyl", "wizz", "orange"];

let clientPromise: Promise<{ client: LaserEyesClient; lib: typeof import("@omnisat/lasereyes-core") }> | null = null;

export function loadClient() {
  if (!clientPromise) {
    clientPromise = import("@omnisat/lasereyes-core").then((lib) => {
      try {
        // Don't silently reconnect a wallet from an earlier visit.
        localStorage.removeItem("defaultWallet");
        for (const k of Object.keys(localStorage)) if (/lasereyes/i.test(k)) localStorage.removeItem(k);
      } catch {
        /* storage blocked */
      }
      const client = new lib.LaserEyesClient(lib.createStores(), lib.createConfig({ network: lib.MAINNET }));
      client.initialize();
      return { client, lib };
    });
    clientPromise.catch(() => {
      clientPromise = null;
    });
  }
  return clientPromise;
}

/** Wallet providers inject themselves a moment after page load; wait briefly for them. */
export async function listWallets(waitMs = 1200): Promise<WalletOption[]> {
  const { client, lib } = await loadClient();
  const start = Date.now();
  while (client.$store.get().isInitializing && Date.now() - start < waitMs) {
    await new Promise((r) => setTimeout(r, 100));
  }
  await new Promise((r) => setTimeout(r, 250));
  const has = client.$store.get().hasProvider ?? {};
  const supported = lib.SUPPORTED_WALLETS as Record<string, { name: string; url: string }>;
  const options = Object.entries(supported)
    .filter(([id]) => id !== "sparrow" && id !== "op_net" && id !== "keplr")
    .map(([id, info]) => ({
      id: id as ProviderType,
      name: NAMES[id] ?? info.name,
      url: info.url,
      installed: Boolean((has as Record<string, boolean | undefined>)[id]),
    }));
  const rank = (id: string) => (PREFERRED.indexOf(id) === -1 ? 99 : PREFERRED.indexOf(id));
  return options.sort((a, b) => Number(b.installed) - Number(a.installed) || rank(a.id) - rank(b.id));
}

export async function connectWallet(provider: ProviderType): Promise<Connected> {
  const { client } = await loadClient();
  await client.connect(provider);
  const s = client.$store.get();
  if (!s.connected || !s.address) throw new Error("The wallet didn't share an address.");
  return { provider, address: s.address, paymentAddress: s.paymentAddress || s.address };
}

export async function signWithWallet(message: string, address: string): Promise<string> {
  const { client, lib } = await loadClient();
  return client.signMessage(message, { toSignAddress: address, protocol: lib.BIP322 });
}

export async function disconnectWallet(): Promise<void> {
  if (!clientPromise) return;
  const { client } = await clientPromise;
  client.disconnect();
}

/** Turns wallet errors into one plain sentence. */
export function walletErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (/reject|denied|cancel|declin|closed/i.test(msg)) return "The request was cancelled in your wallet.";
  if (/not (installed|detected|found)|unsupported wallet/i.test(msg))
    return "That wallet isn't installed in this browser.";
  if (/network/i.test(msg)) return "Switch your wallet to Bitcoin mainnet and try again.";
  if (/doesn't support/i.test(msg)) return msg;
  return "The wallet didn't respond. Unlock it and try again.";
}
