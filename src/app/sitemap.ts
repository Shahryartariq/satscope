import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/guides";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "/", priority: 1 },
    { path: "/prove", priority: 0.8 },
    { path: "/verify", priority: 0.8 },
    { path: "/learn", priority: 0.6 },
    { path: "/about", priority: 0.4 },
    { path: "/privacy", priority: 0.2 },
  ];
  return [
    ...pages.map((p) => ({ url: absoluteUrl(p.path), changeFrequency: "weekly" as const, priority: p.priority })),
    ...GUIDES.map((g) => ({
      url: absoluteUrl(`/learn/${g.slug}`),
      lastModified: g.updated,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
