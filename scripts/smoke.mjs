// Checks a running Satscope (production by default) from the outside: the pages
// load, SEO files are right, and the Vercel settings that only show up live
// (Google Analytics, Search Console, the UniSat key) are actually in effect.
// Usage: node scripts/smoke.mjs [base-url]
const base = (process.argv[2] || process.env.SMOKE_URL || "https://satscope.vercel.app").replace(/\/$/, "");
const EXAMPLE = "bc1pcs8fplulfdqazg4cnds39ssp6ydfxdf5mrvl768pnd79l9ledwgqk4z74m";
const optional = new Set((process.env.SMOKE_OPTIONAL || "").split(",").filter(Boolean));
const failures = [];

async function get(path) {
  const res = await fetch(base + path, { redirect: "manual", headers: { "User-Agent": "Satscope smoke check" } });
  return { status: res.status, text: await res.text(), headers: res.headers };
}

function check(name, ok, detail = "") {
  const skip = !ok && optional.has(name);
  console.log(`${ok ? "ok  " : skip ? "skip" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
  if (!ok && !skip) failures.push(name);
}

const home = await get("/");
check("home", home.status === 200, `HTTP ${home.status}`);
check("csp", (home.headers.get("content-security-policy") || "").includes("frame-ancestors 'none'"));
check("analytics", /googletagmanager\.com\/gtag\/js\?id=G-[A-Z0-9]+/.test(home.text), "GA_MEASUREMENT_ID in Vercel");
check("search-console", /name="google-site-verification"/.test(home.text), "GOOGLE_SITE_VERIFICATION in Vercel");

const sitemap = await get("/sitemap.xml");
const urls = (sitemap.text.match(/<loc>/g) || []).length;
check("sitemap", sitemap.status === 200 && urls >= 10, `${urls} URLs`);

const robots = await get("/robots.txt");
check(
  "robots",
  robots.status === 200 && robots.text.includes("Sitemap:") && !robots.text.includes("Disallow: /address/"),
);

for (const path of ["/prove", "/verify", "/learn", "/learn/protect-inscriptions", "/about", "/privacy"]) {
  const r = await get(path);
  check(`page ${path}`, r.status === 200, `HTTP ${r.status}`);
}

const missing = await get("/no-such-page");
check("404", missing.status === 404, `HTTP ${missing.status}`);

const report = await get(`/address/${EXAMPLE}`);
check("report", report.status === 200 && report.text.includes("Wallet checkup"), `HTTP ${report.status}`);
check("ordinals-index", report.status === 200 && !report.text.includes("fully checked"), "UNISAT_API_KEY in Vercel");

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("\nAll checks passed.");
