import Link from "next/link";
import { headers } from "next/headers";
import { CheckForm } from "@/components/CheckForm";
import { CoinMap, KIND_LABEL, Legend } from "@/components/CoinMap";
import { buildReport } from "@/lib/analyze";
import { formatSats, outpoint } from "@/lib/format";
import { SAMPLE_COLLECTOR, SAMPLE_MARKET, SAMPLE_PAYMENT, SAMPLE_SMALL, SAMPLE_SNAPSHOTS } from "@/lib/sample";
import { AUTHOR, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata = {
  alternates: { canonical: "/" },
};

const FAQ = [
  {
    q: "Is Satscope safe to connect to my wallet?",
    a: "Connecting only shares your public addresses, the same ones you'd give someone to pay you. Satscope never asks you to sign a transaction or send funds. The only thing it will ever ask you to sign is the ownership message on the Prove page, and only when you click that button.",
  },
  {
    q: "Why would my wallet spend an inscription?",
    a: "An inscription lives on a tiny amount of bitcoin (often 330 or 546 sats). To a wallet that doesn't know about Ordinals, that coin looks like small change, so it can use it for a payment or a fee. The inscription goes with it and is gone. This happens most often when inscriptions land in a payment (bc1q or legacy) address.",
  },
  {
    q: "Which wallets work?",
    a: "Xverse, UniSat, Leather, Magic Eden, OKX, Phantom, Oyl, Wizz, Orange and others, through the open-source LaserEyes connector. You can also paste any address without connecting anything.",
  },
  {
    q: "Where does the data come from?",
    a: "Coins, fees and the BTC price come from mempool.space, with blockstream.info as a backup. Inscriptions and Runes come from the UniSat indexer. Satscope reads public blockchain data only.",
  },
  {
    q: "Does Satscope store my addresses?",
    a: "No. Results are cached for a few minutes to keep the site fast and are then thrown away. There are no accounts and no database.",
  },
  {
    q: "Is the health score financial advice?",
    a: "No. It is a technical check of how your coins are set up: what could be spent by mistake and what moving them costs. What you do with your bitcoin is up to you.",
  },
];

const CHECKS = [
  {
    title: "Inscriptions in the wrong place",
    body: "Spots inscriptions and Runes in a payment address, where your wallet could spend them as a fee.",
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r="15" fill="none" stroke="var(--violet)" strokeWidth="2" />
        <path d="M18 10l7 8-7 8-7-8z" fill="var(--violet)" />
      </svg>
    ),
  },
  {
    title: "Extra sats stuck to inscriptions",
    body: "Finds coins carrying an inscription plus far more bitcoin than it needs, money most wallets won't let you spend.",
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="14" cy="18" r="11" fill="none" stroke="var(--violet)" strokeWidth="2" />
        <circle cx="26" cy="18" r="7" fill="none" stroke="var(--green)" strokeWidth="2" />
      </svg>
    ),
  },
  {
    title: "Coins that cost more than they hold",
    body: "Prices every coin at today's fee rate and flags the ones that would cost more to spend than they are worth.",
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r="13" fill="none" stroke="var(--ochre)" strokeWidth="2" strokeDasharray="3 3" />
        <path d="M13 18h10" stroke="var(--ochre)" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "What merging would cost",
    body: "Works out the fee to combine many small coins now versus on a busy day, so you can decide when to move.",
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="9" cy="12" r="4" fill="none" stroke="var(--green)" strokeWidth="2" />
        <circle cx="9" cy="24" r="4" fill="none" stroke="var(--green)" strokeWidth="2" />
        <path d="M13 12c5 0 5 6 9 6M13 24c5 0 5-6 9-6" fill="none" stroke="var(--ink-2)" strokeWidth="1.6" />
        <circle cx="27" cy="18" r="6" fill="none" stroke="var(--green)" strokeWidth="2" />
      </svg>
    ),
  },
  {
    title: "Old address types",
    body: "Points out legacy addresses that make every payment cost up to 2.6 times more block space than Taproot.",
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
        <rect x="6" y="9" width="24" height="18" rx="3" fill="none" stroke="var(--ink-2)" strokeWidth="2" />
        <path d="M11 15h14M11 21h8" stroke="var(--ink-2)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Privacy leaks",
    body: "Notes heavy address reuse, which lets anyone who knows the address see your whole history and balance.",
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
        <path d="M4 18s5-9 14-9 14 9 14 9-5 9-14 9S4 18 4 18z" fill="none" stroke="var(--ink-2)" strokeWidth="2" />
        <circle cx="18" cy="18" r="4" fill="var(--ink-2)" />
      </svg>
    ),
  },
];

export default async function Home() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // Illustration: a two-address wallet from the sample data (see src/lib/sample.ts).
  const demo = buildReport(
    [
      { ...SAMPLE_SNAPSHOTS[SAMPLE_SMALL]!, role: "ordinals" },
      { ...SAMPLE_SNAPSHOTS[SAMPLE_PAYMENT]!, role: "payment" },
    ],
    SAMPLE_MARKET,
  );
  const top = demo.findings[0]!;
  const kinds = [...new Set(demo.coins.map((c) => c.kind))];
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      author: { "@type": "Person", name: AUTHOR.name, url: AUTHOR.url },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <section className="hero">
        <div className="wrap">
          <div>
            <h1>Know what&apos;s in your Bitcoin wallet before you spend from it.</h1>
            <p className="lede">
              Satscope checks any address for bitcoin, Ordinals inscriptions and Runes. It warns you when a payment
              could burn an inscription and shows what your coins cost to move. Free, read-only, no sign-up.
            </p>
            <CheckForm />
            <p className="examples">
              Try a real Ordinals wallet:{" "}
              <Link href={`/address/${SAMPLE_COLLECTOR}`} prefetch={false}>
                bc1pcs8f…k4z74m
              </Link>
            </p>
          </div>
          <div className="tray" aria-label="Example checkup">
            <div className="tray-head">
              <strong>Example checkup</strong>
              <span>{demo.coins.length} coins in 2 addresses</span>
            </div>
            <div className="demo-finding">
              <span className={`demo-grade grade-${demo.grade.toLowerCase()}`} aria-label={`Grade ${demo.grade}`}>
                {demo.grade}
              </span>
              <div>
                <span className="sev">High risk</span>
                <p>{top.title}</p>
              </div>
            </div>
            <CoinMap
              title={`Example coin map: ${demo.coins.length} coins across an Ordinals address and a payment address`}
              coins={demo.coins.map((c) => ({
                key: outpoint(c),
                value: c.value,
                kind: c.kind,
                label: `${formatSats(c.value)}: ${KIND_LABEL[c.kind]}`,
              }))}
              width={520}
              idPrefix="hero"
            />
            <Legend kinds={kinds} />
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="checks-title">
        <div className="wrap">
          <div className="section-head">
            <h2 id="checks-title">What the checkup looks at</h2>
            <p>
              Wallet apps show you a balance. Satscope looks at each coin behind it, because that is where inscriptions
              get lost and fees add up.
            </p>
          </div>
          <div className="checks">
            {CHECKS.map((c) => (
              <div className="check" key={c.title}>
                {c.icon}
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="prove-title">
        <div className="wrap split">
          <div>
            <h2 id="prove-title">Prove an address is yours, without moving a sat</h2>
            <p className="lede">
              Sign a short message with your wallet and get a link anyone can check. Useful for OTC trades, giveaways,
              allowlists and proof of funds.
            </p>
            <div className="actions-row">
              <Link className="btn btn-primary" href="/prove">
                Create a proof
              </Link>
              <Link className="btn btn-quiet" href="/verify">
                Verify a signature
              </Link>
            </div>
          </div>
          <div className="proof-card" aria-label="Example of a signed proof">
            <span className="verdict ok">
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M5 9.4l2.6 2.6L13 6.6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Signature is valid
            </span>
            <pre>
              {
                "Satscope ownership proof\nI control this Bitcoin address: bc1p…z74m\nNote: OTC trade with Sam\nSigned: 2026-11-06T10:00:00.000Z"
              }
            </pre>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="faq-title">
        <div className="wrap">
          <div className="section-head">
            <h2 id="faq-title">Questions</h2>
          </div>
          <div className="faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
