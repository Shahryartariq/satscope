import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import Script from "next/script";
import { SiteFooter } from "@/components/SiteFooter";
import { PageViews } from "@/components/PageViews";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import "./globals.css";

const sans = localFont({
  src: "../fonts/bricolage-grotesque.woff2",
  variable: "--font-sans",
  weight: "200 800",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Arial"],
});

const mono = localFont({
  src: "../fonts/martian-mono.woff2",
  variable: "--font-mono",
  weight: "100 800",
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});

const GA_ID = /^G-[A-Z0-9]{4,20}$/.test(process.env.GA_MEASUREMENT_ID ?? "")
  ? process.env.GA_MEASUREMENT_ID
  : undefined;
const GSC = process.env.GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: ${SITE_TAGLINE} for BTC, Ordinals and Runes`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: "/",
    title: `${SITE_NAME}: ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: `${SITE_NAME}: ${SITE_TAGLINE}`, description: SITE_DESCRIPTION },
  verification: GSC ? { google: GSC } : undefined,
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0f151e" },
  ],
};

/** Applies the saved theme before first paint so there is no flash. */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("satscope:theme");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        {GA_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
              nonce={nonce}
            />
            <Script id="ga" strategy="afterInteractive" nonce={nonce}>
              {`window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag("js",new Date());var p=location.pathname.replace(/^\/address\/[^/]+/,"/address/:address"),w=/^\/(address\/|wallet$|verify$)/.test(p);gtag("config","${GA_ID}",{page_location:location.origin+p,page_path:p,page_title:w?"Wallet checkup":document.title});`}
            </Script>
            <PageViews />
          </>
        ) : null}
      </body>
    </html>
  );
}
