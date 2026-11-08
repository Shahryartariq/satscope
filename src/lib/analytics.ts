/**
 * What Satscope tells Google Analytics about a page. Addresses never leave the
 * browser: report paths are collapsed, query strings (wallet addresses, proofs)
 * are dropped, and report titles, which hold a shortened address, are replaced.
 */
export function analyticsPage(pathname: string, title: string): { path: string; title: string } {
  const path = pathname.replace(/^\/address\/[^/?#]+/, "/address/:address").replace(/[?#].*$/, "") || "/";
  const personal = path.startsWith("/address/") || path === "/wallet" || path === "/verify";
  return { path, title: personal ? "Wallet checkup" : title };
}
