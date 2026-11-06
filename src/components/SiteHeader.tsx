import Link from "next/link";
import { LogoMark } from "./Logo";
import { NavLinks } from "./NavLinks";
import { ThemeSwitch } from "./ThemeSwitch";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/" className="brand" aria-label="Satscope home">
          <LogoMark />
          Satscope
        </Link>
        <NavLinks className="nav" />
        <ThemeSwitch />
      </div>
      <NavLinks className="mobile-nav" />
    </header>
  );
}
