import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES, getGuide } from "@/lib/guides";
import { AUTHOR, absoluteUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = getGuide((await params).slug);
  if (!g) return {};
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: `/learn/${g.slug}` },
    openGraph: { type: "article", title: g.title, description: g.description, url: `/learn/${g.slug}` },
  };
}

export default async function GuidePage({ params }: Props) {
  const g = getGuide((await params).slug);
  if (!g) notFound();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.title,
    description: g.description,
    dateModified: g.updated,
    author: { "@type": "Person", name: AUTHOR.name, url: AUTHOR.url },
    mainEntityOfPage: absoluteUrl(`/learn/${g.slug}`),
  };
  const others = GUIDES.filter((o) => o.slug !== g.slug);
  return (
    <article className="wrap prose">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <p className="crumbs">
        <Link href="/">Satscope</Link> / <Link href="/learn">Guides</Link>
      </p>
      <h1>{g.title}</h1>
      <p className="muted">
        Updated {new Date(g.updated).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
      </p>
      {g.sections.map((s) => (
        <section key={s.heading}>
          <h2>{s.heading}</h2>
          {s.paragraphs?.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
          {s.list ? (
            <ul>
              {s.list.map((li) => (
                <li key={li.slice(0, 40)}>{li}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
      <div className="panel guide-cta">
        <h2>Check your own wallet</h2>
        <p>Paste an address or connect a wallet. It takes a few seconds and needs no sign-up.</p>
        <div className="actions-row">
          <Link className="btn btn-primary" href="/">
            Run a free checkup
          </Link>
        </div>
      </div>
      <h2>More guides</h2>
      <ul>
        {others.map((o) => (
          <li key={o.slug}>
            <Link href={`/learn/${o.slug}`}>{o.title}</Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
