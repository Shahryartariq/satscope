"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  {
    href: "/",
    label: "Check a wallet",
    match: (p: string) => p === "/" || p.startsWith("/address") || p.startsWith("/wallet"),
  },
  { href: "/prove", label: "Prove ownership", match: (p: string) => p.startsWith("/prove") },
  { href: "/verify", label: "Verify a signature", match: (p: string) => p.startsWith("/verify") },
  { href: "/learn", label: "Guides", match: (p: string) => p.startsWith("/learn") },
];

export function NavLinks({ className }: { className: string }) {
  const path = usePathname() ?? "/";
  return (
    <nav className={className} aria-label={className === "nav" ? "Main" : "Main (mobile)"}>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={l.match(path) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
