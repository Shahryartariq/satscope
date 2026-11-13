export interface GuideSection {
  heading: string;
  paragraphs?: string[];
  list?: string[];
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  updated: string;
  sections: GuideSection[];
}

export const GUIDES: Guide[] = [
  {
    slug: "protect-inscriptions",
    title: "How to keep your Ordinals from being spent as fees",
    description:
      "Why inscriptions get lost when a wallet pays a fee, which addresses are risky, and three habits that keep your Ordinals safe.",
    updated: "2026-11-06",
    sections: [
      {
        heading: "Why inscriptions disappear",
        paragraphs: [
          "An inscription is written onto a single satoshi, and that satoshi sits inside a coin (a UTXO) usually worth 330, 546 or 10,000 sats. To your wallet, that coin is just a small amount of bitcoin.",
          "When you send bitcoin, the wallet picks coins to cover the amount and the fee. A wallet that doesn't track Ordinals can pick the inscribed coin. The inscription then goes to whoever receives the payment, or to the miner as part of the fee. There is no undo.",
        ],
      },
      {
        heading: "Where the risk is highest",
        list: [
          "Inscriptions in a payment address. Wallets like Xverse and Leather keep Ordinals in a Taproot address (bc1p…) and spend from a separate payment address (often bc1q… or 3…). An inscription that lands in the payment address can be spent with your next payment.",
          "Single-address wallets that know nothing about Ordinals, including many exchange and mobile wallets.",
          "Importing an Ordinals seed phrase into a regular Bitcoin wallet and sending from it.",
        ],
      },
      {
        heading: "Three habits that keep them safe",
        list: [
          "Receive inscriptions only to your Ordinals (Taproot) address, and check the address the sender uses.",
          "Use an Ordinals-aware wallet for anything that touches inscriptions or Runes. These wallets lock inscribed coins so they aren't used for fees.",
          "Run a Satscope checkup before you send bitcoin from a wallet that has ever held inscriptions. It lists every inscribed coin and warns you if any sits in a payment address.",
        ],
      },
      {
        heading: "If an inscription is already in your payment address",
        paragraphs: [
          "Don't send bitcoin from that address until you've moved it. Open an Ordinals-aware wallet (Xverse, UniSat, Leather, Magic Eden and others can do this), send the inscription to your own Taproot Ordinals address, and run the checkup again to confirm it moved.",
        ],
      },
    ],
  },
  {
    slug: "utxo-consolidation",
    title: "UTXO consolidation: when merging your coins saves fees",
    description:
      "What UTXO consolidation is, how to estimate its cost, when it pays off, and the privacy trade-off to know before you do it.",
    updated: "2026-11-06",
    sections: [
      {
        heading: "Your balance is made of separate coins",
        paragraphs: [
          "A Bitcoin wallet doesn't hold one balance. It holds unspent outputs (UTXOs), one for each payment you received. Ten deposits of 0.001 BTC are ten coins, and a payment that needs all of them has ten inputs.",
          "Fees are charged by transaction size, and every input adds size: about 57.5 vB for a Taproot coin, 68 vB for Native SegWit and 148 vB for a legacy coin. Many small coins make every future payment bigger and more expensive.",
        ],
      },
      {
        heading: "What consolidation does",
        paragraphs: [
          "Consolidation sends many of your coins to yourself in one transaction, leaving one larger coin. You pay for all the inputs once, at a time you choose, instead of later at whatever the fee rate is when you need to pay someone.",
        ],
      },
      {
        heading: "How to estimate the cost",
        list: [
          "Size ≈ 10.5 vB + (input size × number of coins) + one output (about 31 to 43 vB).",
          "Cost = size × fee rate. Twenty Native SegWit coins at 1 sat/vB: (10.5 + 20 × 68 + 31) × 1 ≈ 1,402 sats.",
          "The same coins on a busy day at 20 sat/vB would cost about 28,000 sats to spend.",
        ],
        paragraphs: [
          "Satscope does this sum for your wallet using today's fee rates, and only counts plain bitcoin coins. Inscriptions and Runes are left out on purpose.",
        ],
      },
      {
        heading: "The trade-off",
        paragraphs: [
          "Merging coins links them on-chain, so anyone watching can tell they belong to the same owner. If some coins came from a KYC exchange and others didn't, merging them ties the two together. Keep coins with different privacy needs apart.",
          "Never include inscribed or rune-carrying coins in a consolidation unless your wallet handles them explicitly.",
        ],
      },
    ],
  },
  {
    slug: "bitcoin-dust",
    title: "Bitcoin dust: coins worth less than the fee to spend them",
    description:
      "What Bitcoin dust is, the dust limit for each address type, why tiny coins show up in your wallet, and what to do about them.",
    updated: "2026-11-06",
    sections: [
      {
        heading: "Two meanings of dust",
        paragraphs: [
          "Bitcoin Core treats an output as dust when it's below a fixed limit: 546 sats for legacy addresses, 540 for nested SegWit, 294 for Native SegWit and 330 for Taproot. Transactions that create smaller outputs aren't relayed.",
          "People also call a coin dust when spending it costs more than it holds. That depends on the fee rate: a 546-sat Taproot coin costs about 58 sats to spend at 1 sat/vB, but about 1,150 sats at 20 sat/vB.",
        ],
      },
      {
        heading: "Why tiny coins appear",
        list: [
          "Inscription postage: most inscriptions sit on 330 or 546-sat coins. These are not junk. They carry the inscription.",
          "Rune transfers, which also use small coins.",
          "Change from payments, and leftover amounts from exchange withdrawals.",
          "Dusting attacks: strangers send tiny amounts hoping you'll spend them together with your other coins, which links your addresses.",
        ],
      },
      {
        heading: "What to do",
        list: [
          "Check what a small coin carries before you treat it as dust. Satscope marks inscribed and rune coins separately from plain bitcoin.",
          "Leave uneconomical coins alone while fees are high. They're still yours.",
          "If you don't recognise a tiny incoming coin, don't spend it with your other coins. Many wallets let you freeze a coin so it's never picked.",
          "When fees are very low, sweeping small plain-bitcoin coins into one can make sense. See the consolidation guide first.",
        ],
      },
    ],
  },
  {
    slug: "prove-bitcoin-address-ownership",
    title: "How to prove you own a Bitcoin address (BIP-322)",
    description:
      "Sign a message to prove you control a Bitcoin address without sending a transaction. How BIP-322 works, which wallets support it, and how to check a signature.",
    updated: "2026-11-06",
    sections: [
      {
        heading: "Signing instead of sending",
        paragraphs: [
          "The common way to prove you own an address is to send a small amount from it. That costs a fee and leaves a trace forever. Signing a message proves the same thing for free: only the holder of the private key can produce a signature that matches the address.",
        ],
      },
      {
        heading: "BIP-322 and the older format",
        paragraphs: [
          'The original "signed message" format, supported by Bitcoin Core, Electrum and Sparrow, was designed for legacy addresses. BIP-322 extends message signing to SegWit and Taproot addresses, and it\'s what Ordinals wallets such as Xverse, UniSat and Leather use.',
          "Satscope's verifier accepts both, for Taproot, Native SegWit, Nested SegWit and legacy addresses.",
        ],
      },
      {
        heading: "How to do it with Satscope",
        list: [
          "Open Prove ownership and connect your wallet.",
          "Pick the address and add a short note, such as who the proof is for.",
          "Approve the message in your wallet. It's plain text, not a transaction.",
          "Share the link. It opens a page that checks the signature every time someone views it.",
        ],
      },
      {
        heading: "What a signature does and doesn't prove",
        list: [
          "It proves the signer controlled the address at the moment of signing.",
          "It doesn't prove the funds are still there, or that the signer still holds the key. Check the balance separately and ask for a fresh, dated note when it matters.",
          "Never sign a message someone else wrote unless you understand every word. A signed message can be used as evidence.",
        ],
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
