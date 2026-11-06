import type { Metadata } from "next";
import Link from "next/link";
import { ProveFlow } from "@/components/ProveFlow";

export const metadata: Metadata = {
  title: "Prove you own a Bitcoin address",
  description:
    "Sign a message with Xverse, UniSat, Leather or another Bitcoin wallet and get a link that proves you control the address. Free, no transaction, BIP-322.",
  alternates: { canonical: "/prove" },
};

export default function ProvePage() {
  return (
    <section className="wrap prose">
      <p className="crumbs">
        <Link href="/">Satscope</Link> / Prove ownership
      </p>
      <h1>Prove you own a Bitcoin address</h1>
      <p>
        Sign a short message with your wallet. You get a link that shows anyone the signature is valid, without moving
        any bitcoin. It works with Taproot, Native SegWit and Nested SegWit addresses (BIP-322).
      </p>
      <div className="panel prove-panel">
        <ProveFlow />
      </div>
      <p>
        Someone sent you a signature from another wallet, like Sparrow or Electrum?{" "}
        <Link href="/verify">Verify it here</Link>.
      </p>
    </section>
  );
}
