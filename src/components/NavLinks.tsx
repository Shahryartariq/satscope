"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  {
    href: "/",
    label: "Check a wallet",
    short: "Check wallet",
    match: (p: string) => p === "/" || p.startsWith("/address") || p.startsWith("/wallet"),
  },
  { href: "/prove", label: "Prove ownership", short: "Prove", match: (p: string) => p.startsWith("/prove") },
  { href: "/verify", label: "Verify a signature", short: "Verify", match: (p: string) => p.startsWith("/verify") },
  { href: "/learn", label: "Guides", short: "Guides", match: (p: string) => p.startsWith("/learn") },
];

export function NavLinks({ className }: { className: string }) {
  const path = usePathname() ?? "/";
  return (
    <nav className={className} aria-label={className === "nav" ? "Main" : "Main (mobile)"}>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={l.match(path) ? "page" : undefined}>
          {className === "mobile-nav" ? l.short : l.label}
        </Link>
      ))}
    </nav>
  );
}
