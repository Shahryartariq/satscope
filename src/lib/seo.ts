import type { Metadata } from "next";
import { SITE_NAME } from "./site";

/** The site's share card (src/app/opengraph-image.tsx). */
export const SHARE_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${SITE_NAME}: free Bitcoin wallet checkup`,
};

/**
 * Metadata for one page. A page that sets `openGraph` or `twitter` replaces the
 * layout's values entirely (Next merges shallowly), so each page sets its own
 * title, URL and image here instead of inheriting the home page's.
 */
export function pageMetadata(p: {
  title: string;
  description: string;
  /** Leave out for pages with no single address of their own (an invalid address, say). */
  path?: string;
  type?: "website" | "article";
  published?: string;
  modified?: string;
  index?: boolean;
}): Metadata {
  const shareTitle = `${p.title} | ${SITE_NAME}`;
  return {
    title: p.title,
    description: p.description,
    ...(p.path ? { alternates: { canonical: p.path } } : {}),
    openGraph: {
      type: p.type ?? "website",
      siteName: SITE_NAME,
      title: shareTitle,
      description: p.description,
      ...(p.path ? { url: p.path } : {}),
      images: [SHARE_IMAGE],
      ...(p.type === "article" ? { publishedTime: p.published, modifiedTime: p.modified } : {}),
    },
    twitter: { card: "summary_large_image", title: shareTitle, description: p.description, images: [SHARE_IMAGE.url] },
    ...(p.index === false ? { robots: { index: false, follow: true } } : {}),
  };
}
