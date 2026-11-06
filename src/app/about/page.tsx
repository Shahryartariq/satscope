import type { Metadata } from "next";
import Link from "next/link";
import { REPO_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "How Satscope works",
  description:
    "Where Satscope's data comes from, how the health score is worked out, and what it never does with your wallet.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <article className="wrap prose">
      <p className="crumbs">
        <Link href="/">Satscope</Link> / How it works
      </p>
      <h1>How Satscope works</h1>
      <p>
        Satscope looks at a Bitcoin wallet one coin at a time. For each unspent output it works out whether it carries
        an inscription or Runes, what it would cost to spend at today&apos;s fee rate, and whether anything about it
        puts your assets at risk.
      </p>

      <h2>Data sources</h2>
      <ul>
        <li>
          <strong>Coins and address history:</strong> mempool.space, with blockstream.info as a backup.
        </li>
        <li>
          <strong>Inscriptions and Runes:</strong> the UniSat indexer. If it doesn&apos;t answer, the report says so and
          marks postage-sized coins as &quot;check first&quot; instead of guessing.
        </li>
        <li>
          <strong>Fee rates and BTC price:</strong> mempool.space, with blockstream.info and CoinGecko as backups.
        </li>
        <li>
          <strong>Wallet connection:</strong> LaserEyes, an open-source connector for Xverse, UniSat, Leather, Magic
          Eden, OKX, Phantom and other Bitcoin wallets.
        </li>
      </ul>

      <h2>The health score</h2>
      <p>
        Every check that finds something has a weight: high-risk findings take 30 points off, medium 15, low 6. Notes,
        such as unconfirmed coins, take nothing off. The score starts at 100 and the grade follows it: A from 90, B from
        75, C from 60, D from 40, F below that. The score describes how your coins are set up; it isn&apos;t a judgement
        of what you own or advice on what to do.
      </p>

      <h2>What Satscope never does</h2>
      <ul>
        <li>It never asks you to sign a transaction or send funds.</li>
        <li>It never sees your seed phrase or private keys.</li>
        <li>
          It doesn&apos;t keep a record of the addresses you check. Results are cached for a few minutes, then dropped.
        </li>
      </ul>

      <h2>Open source</h2>
      <p>
        The code is on <a href={REPO_URL}>GitHub</a>: Next.js, React and TypeScript, with tests for every check. Issues
        and pull requests are welcome.
      </p>
    </article>
  );
}
