"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { analyticsPage } from "@/lib/analytics";

type Gtag = (...args: unknown[]) => void;

/**
 * Counts in-app navigations. The first page view is sent by the inline config
 * in the layout; GA's own history tracking stays off because it would send the
 * full address bar.
 */
export function PageViews() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const gtag = (window as unknown as { gtag?: Gtag }).gtag;
    if (typeof gtag !== "function") return;
    // Wait a tick so the new page's <title> is in place.
    const t = setTimeout(() => {
      const page = analyticsPage(pathname, document.title);
      gtag("event", "page_view", {
        page_location: location.origin + page.path,
        page_path: page.path,
        page_title: page.title,
      });
    }, 0);
    return () => clearTimeout(t);
  }, [pathname]);
  return null;
}
