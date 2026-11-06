import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Bitcoin wallet guides",
  description: "Short, practical guides to Ordinals safety, UTXO consolidation, dust and proving address ownership.",
  alternates: { canonical: "/learn" },
};

export default function LearnPage() {
  return (
    <section className="wrap prose">
      <p className="crumbs">
        <Link href="/">Satscope</Link> / Guides
      </p>
      <h1>Guides</h1>
      <p>Short answers to the questions the checkup raises.</p>
      <ul className="guide-list">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/learn/${g.slug}`}>
              <h2>{g.title}</h2>
              <p>{g.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
