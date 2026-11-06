# Satscope

**A free Bitcoin wallet checkup.** Paste any address or connect a wallet, and Satscope shows every coin in it: plain
bitcoin, Ordinals inscriptions and Runes. It warns you before an inscription gets spent as a fee, prices each coin at
today's fee rate, and lets you prove you own an address with a signed message.

**Live: [satscope.vercel.app](https://satscope.vercel.app)**

![Satscope home page](docs/screenshots/home-light.png)

## Why it exists

Bitcoin wallets show one balance, but a balance is made of separate coins (UTXOs). That is where Ordinals users lose
inscriptions: a wallet that doesn't track them treats a 546-sat inscribed coin as small change and spends it on the next
fee. Satscope looks at each coin and tells you, in plain words, what could go wrong and what to do about it.

## What it checks

| Check                                                  | What you see                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| Inscriptions or Runes in a payment address             | High-risk warning, with the exact coins and how to move them |
| Extra sats stuck to an inscription                     | How much bitcoin rides along with each inscription           |
| Several inscriptions or Runes on one coin              | Coins whose assets can't be sent separately                  |
| Coins worth less than the fee to spend them            | Priced at the current no-rush fee rate                       |
| Many small coins                                       | Cost to merge them today versus on a busy day                |
| Legacy address types, address reuse, unconfirmed coins | Short notes with the reason                                  |

Every finding feeds a 0 to 100 health score with a grade. The score describes how the coins are set up; it isn't
financial advice.

| Wallet report                               | Every coin, to scale                       | Mobile                                 |
| ------------------------------------------- | ------------------------------------------ | -------------------------------------- |
| ![Report](docs/screenshots/report-dark.png) | ![Coin map](docs/screenshots/coin-map.png) | ![Mobile](docs/screenshots/mobile.png) |

## Features

- **Wallet connect with [LaserEyes](https://github.com/omnisat/lasereyes-mono):** Xverse, UniSat, Leather, Magic Eden,
  OKX, Phantom, Oyl, Wizz, Orange and more. Satscope reads the Ordinals and payment addresses and checks them together,
  then disconnects. The 3 MB library loads only when someone opens the wallet list.
- **Coin map:** every unspent output drawn to scale (log of its value) and coloured by what it carries. Each coin links
  to its row in the table, and the map works with a keyboard.
- **Ownership proofs (BIP-322):** sign a dated message with your wallet and share a link. Nothing is stored; the link
  carries the address, message and signature, and the page verifies it again on every visit.
- **Signature verifier:** checks BIP-322 signatures from Ordinals wallets and classic signed messages from Electrum,
  Sparrow and Bitcoin Core.
- **Honest when data is missing:** if the Ordinals index doesn't answer, the report says so and marks postage-sized coins
  "check first" instead of calling them safe.
- **Guides** on Ordinals safety, UTXO consolidation, dust and proving ownership.
- Light and dark themes with no flash, keyboard focus everywhere, reduced-motion support, and WCAG AA contrast checked
  by tests.

## How it works

```
Address or wallet ──► /address/[addr] or /wallet?o=…&p=…   (server components)
                          │
                          ├─ mempool.space  (coins, history, fees, price)   ← blockstream.info backup
                          ├─ UniSat Open API (inscriptions and Runes per coin, optional key)
                          │      all cached in the Vercel Runtime Cache
                          ▼
                    src/lib/analyze.ts   pure functions: classify coins → findings → score
                          ▼
                    ReportView (server-rendered HTML + SVG, tiny client islands)
```

- `src/lib/analyze.ts` holds the rules. It is pure TypeScript with no I/O, so every rule is unit-tested.
- `src/lib/esplora.ts` and `src/lib/unisat.ts` fetch and map upstream data; `src/lib/cache.ts` shares results across
  function instances and merges identical requests in flight.
- `src/lib/budget.ts` keeps usage inside the UniSat free plan and limits each visitor.
- `src/lib/address.ts` validates mainnet addresses (bech32, bech32m and base58check) in the browser and on the server.
- `src/lib/proof.ts` and `src/lib/verify.ts` build, pack and verify ownership proofs with
  [bip322-js](https://github.com/ACken2/bip322-js).
- `src/components/wallet/` wraps LaserEyes.

## Tech stack

Next.js 16 (App Router), React 19, TypeScript (strict), hand-written CSS with design tokens, self-hosted Bricolage
Grotesque and Martian Mono, LaserEyes, bip322-js, Vitest, Playwright with axe-core, GitHub Actions, Vercel.

Security: per-request nonce Content Security Policy, HSTS, no inline styles, no cookies, and addresses are stripped from
analytics page paths.

## Run it locally

```bash
git clone https://github.com/Shahryartariq/satscope.git
cd satscope
npm install
cp .env.example .env.local   # every variable is optional
npm run dev                  # http://localhost:3000
```

Set `SATSCOPE_SAMPLE_DATA=1` to use the bundled sample wallets instead of live APIs.

| Variable                   | Purpose                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `UNISAT_API_KEY`           | Turns on the Ordinals and Runes checks. Free key at [developer.unisat.io](https://developer.unisat.io). |
| `SITE_URL`                 | Public address for canonical links and share links.                                                     |
| `GA_MEASUREMENT_ID`        | Google Analytics 4 ID. No analytics load without it.                                                    |
| `GOOGLE_SITE_VERIFICATION` | Search Console HTML-tag code.                                                                           |
| `ESPLORA_URL`              | Use another Esplora API instead of mempool.space.                                                       |

## Tests

```bash
npm run check      # types + unit tests
npm run e2e        # Playwright on desktop and mobile, with axe accessibility checks in both themes
```

Unit tests use real coin data captured from two Taproot Ordinals wallets plus made-up wallets that trigger every finding,
and the published BIP-322 test vectors.

## Notes

- `@omnisat/lasereyes-core` lists an unpinned git dependency that is already bundled inside the package, so
  `package.json` overrides it with an empty local module. Installs stay fast and reproducible.
- Satscope checks Bitcoin mainnet only.

## License

MIT. Built by [Muhammad Shehryar](https://github.com/Shahryartariq).
