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

/**
 * The referrer GA may see. GA reads document.referrer by default, which on
 * Satscope can be a full report or proof URL. Our own pages are reduced to the
 * collapsed path, other sites to their origin.
 */
export function analyticsReferrer(referrer: string, origin: string): string {
  try {
    const u = new URL(referrer);
    return u.origin === origin ? u.origin + analyticsPage(u.pathname, "").path : u.origin;
  } catch {
    return "";
  }
}

/**
 * The inline script that starts Google Analytics. String.raw keeps the regex
 * backslashes: in a plain template literal "\/" turns into "/", which made the
 * old inline script a syntax error, so GA never started. A unit test runs it.
 */
export function gaBootScript(id: string): string {
  return String.raw`window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag("js",new Date());var p=location.pathname.replace(/^\/address\/[^/]+/,"/address/:address"),w=/^\/(address\/|wallet$|verify$)/.test(p),r="";try{var u=new URL(document.referrer);r=u.origin===location.origin?u.origin+u.pathname.replace(/^\/address\/[^/]+/,"/address/:address"):u.origin}catch(e){}gtag("config",${JSON.stringify(id)},{page_location:location.origin+p,page_path:p,page_referrer:r,page_title:w?"Wallet checkup":document.title});`;
}
