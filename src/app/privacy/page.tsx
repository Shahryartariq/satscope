import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Satscope collects (very little) and what it never stores.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <article className="wrap prose">
      <p className="crumbs">
        <Link href="/">Satscope</Link> / Privacy
      </p>
      <h1>Privacy</h1>
      <p>Satscope has no accounts, no database and no cookies of its own.</p>

      <h2>Addresses you check</h2>
      <p>
        To build a report, Satscope&apos;s server asks mempool.space, blockstream.info and the UniSat indexer about the
        address. Those services see the request come from Satscope&apos;s server, not from you. Results are cached for
        up to ten minutes so repeat visits are fast, then discarded. Bitcoin addresses and their history are public on
        the blockchain.
      </p>

      <h2>Wallet connection</h2>
      <p>
        When you connect a wallet, it shares your public addresses with this page. Satscope uses them to open your
        report and then disconnects. On the Prove page, your wallet signs a plain-text message you can read first; the
        resulting proof lives only in the link you share.
      </p>

      <h2>Analytics</h2>
      <p>
        If analytics are switched on, Satscope uses Google Analytics to count page views. Addresses are removed from the
        page path before anything is sent, so reports are counted as &quot;/address/:address&quot;.
      </p>

      <h2>Server logs</h2>
      <p>
        The hosting provider, Vercel, keeps short-lived request logs (including IP address and page path) to run and
        protect the service. Satscope keeps a short in-memory count per IP address to limit abuse.
      </p>
    </article>
  );
}
