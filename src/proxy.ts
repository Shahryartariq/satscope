import { NextResponse, type NextRequest } from "next/server";
import { normalizeAddress } from "@/lib/address";

/**
 * Per-request nonce for a strict Content Security Policy.
 * - script-src allows our own scripts plus browser-extension scripts, because
 *   Bitcoin wallets (Xverse, UniSat, Leather, …) inject their providers that way.
 * - connect-src stays open to https: so wallet libraries can reach their own APIs.
 * - Inscription images and previews load from ordinals.com only.
 */
export function proxy(request: NextRequest) {
  const redirect = addressRedirect(request);
  if (redirect) return redirect;
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' chrome-extension: moz-extension: safari-web-extension:${dev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob: https://ordinals.com https://www.googletagmanager.com https://*.google-analytics.com",
    "font-src 'self'",
    "connect-src 'self' https: wss:",
    // Inscription previews: ordinals.com's own preview pages, in sandboxed frames.
    "frame-src https://ordinals.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const target = brokenPathTarget(request);
  const response = target
    ? NextResponse.rewrite(target, { request: { headers: requestHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

/**
 * One URL per address, answered before the page starts streaming (once it
 * streams, a redirect can only happen in the browser):
 * - upper-case bech32, stray spaces and "bitcoin:" links → 308 to the clean form;
 * - broken percent escapes ("/address/%E0%A4%A"), which make Next.js answer 500
 *   before any page code runs → the "not recognised" page.
 */
function addressRedirect(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname;
  if (!path.startsWith("/address/")) return null;
  const raw = path.slice("/address/".length);
  const url = request.nextUrl.clone();
  url.search = "";
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    url.pathname = "/address/not-an-address";
    return NextResponse.redirect(url, 307);
  }
  const clean = normalizeAddress(decoded);
  if (!clean || clean === decoded || /[/?#]/.test(clean)) return null;
  url.pathname = `/address/${encodeURIComponent(clean)}`;
  return NextResponse.redirect(url, 308);
}

/** Broken percent escapes elsewhere (e.g. /learn/%E0%A4%A) go to the 404 page instead of a 500. */
function brokenPathTarget(request: NextRequest): URL | null {
  const path = request.nextUrl.pathname;
  try {
    decodeURIComponent(path);
    return null;
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = "/page-not-found";
    url.search = "";
    return url;
  }
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|robots.txt|sitemap.xml|manifest.webmanifest).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
