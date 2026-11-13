import Link from "next/link";
import { AUTHOR, REPO_URL } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="about">
          <p>
            <strong>Satscope</strong> is a free Bitcoin wallet checkup. It reads public blockchain data and stores
            nothing about your wallet. Nothing moves unless you sign it in your own wallet.
          </p>
          <p className="muted">
            Not financial advice. Built by <a href={AUTHOR.url}>{AUTHOR.name}</a>, open source on{" "}
            <a href={REPO_URL}>GitHub</a>.
          </p>
        </div>
        <nav aria-label="Tools">
          <h2>Tools</h2>
          <Link href="/">Wallet checkup</Link>
          <Link href="/prove">Prove ownership</Link>
          <Link href="/verify">Verify a signature</Link>
        </nav>
        <nav aria-label="About">
          <h2>About</h2>
          <Link href="/learn">Guides</Link>
          <Link href="/about">How it works</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}
