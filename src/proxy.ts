import { NextResponse, type NextRequest } from "next/server";

/**
 * Per-request nonce for a strict Content Security Policy.
 * - script-src allows our own scripts plus browser-extension scripts, because
 *   Bitcoin wallets (Xverse, UniSat, Leather, …) inject their providers that way.
 * - connect-src stays open to https: so wallet libraries can reach their own APIs.
 * - Inscription images and previews load from ordinals.com only.
 */
export function proxy(request: NextRequest) {
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
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
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
