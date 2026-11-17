// Headless Edge/Chrome: axe WCAG 2.2 AA, 360px overflow, redirect target, keyboard. Offline: destination requests are intercepted.
import puppeteer from "puppeteer-core";
import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname } from "node:path";
const axeSrc = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const exe = [process.env.CHROME_PATH, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].find(p => p && existsSync(p));
if (!exe) {
  if (process.env.SKIP_BROWSER === "1") { console.error("INCOMPLETE: browser tests skipped (SKIP_BROWSER=1, no browser found)"); process.exit(0); }
  console.error("FAIL: no local Chromium-based browser found (set CHROME_PATH, or SKIP_BROWSER=1 to skip explicitly)"); process.exit(1);
}
if (process.env.SKIP_BROWSER === "1") { console.error("INCOMPLETE: browser tests skipped (SKIP_BROWSER=1)"); process.exit(0); }
const overrides = {}; // path -> replacement body, used to prove the redirect tests catch wrong destinations
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".txt": "text/plain" };
const srv = createServer((q, r) => {
  const p = q.url === "/" ? "index.html" : q.url.split("?")[0].slice(1);
  if (p in overrides) { r.writeHead(200, { "content-type": types[extname(p)] || "text/html" }); return r.end(overrides[p]); }
  if (!existsSync(p)) { r.writeHead(404, { "content-type": "text/html" }); return r.end(readFileSync("404.html")); }
  r.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" }); r.end(readFileSync(p));
}).listen(0);
const base = `http://127.0.0.1:${srv.address().port}`;
const DEST = "https://ezzyousef-site.vercel.app/";
let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error("FAIL:", m); } };
const browser = await puppeteer.launch({ executablePath: exe, headless: true });
async function open(path, { js = true, dark = false, abort = false } = {}) {
  const pg = await browser.newPage();
  await pg.setJavaScriptEnabled(js);
  await pg.setViewport({ width: 360, height: 640 });
  await pg.emulateMediaFeatures([{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }]);
  const nav = [], csp = [], external = [];
  await pg.setRequestInterception(true);
  pg.on("request", r => {
    const u = r.url();
    if (r.isNavigationRequest() && r.frame() === pg.mainFrame()) nav.push(u); // every top-level navigation
    if (!u.startsWith(base) && !u.startsWith(DEST)) external.push(u);
    if (abort && u.endsWith("/redirect.js")) r.respond({ status: 200, contentType: "text/javascript", body: "" }); // audit the page, not the redirect
    else if (u.startsWith(DEST) && abort) r.respond({ status: 204 }); // 204 keeps the current document
    else if (u.startsWith(DEST)) r.respond({ status: 200, contentType: "text/html", body: "<title>dest</title>" });
    else r.continue();
  });
  pg.on("console", m => /Content Security Policy/i.test(m.text()) && csp.push(m.text()));
  return { pg, nav, csp, external, go: () => pg.goto(base + path, { waitUntil: "load" }).catch(() => {}) };
}
// Navigation to the destination gets a 204 (no navigation) so the fallback page itself stays loaded for auditing.
for (const path of ["/", "/definitely-missing"]) for (const dark of [false, true]) {
  const t = await open(path, { dark, abort: true });
  await t.pg.evaluateOnNewDocument(axeSrc); // injected outside the page CSP so CSP violations stay measurable
  await t.go();
  const res = await t.pg.evaluate(() => axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] }));
  ok(res.violations.length === 0, `axe ${path} dark=${dark}: ${res.violations.map(v => v.id + ":" + v.nodes.length).join(",")}`);
  const w = await t.pg.evaluate(() => document.documentElement.scrollWidth);
  ok(w <= 360, `360px overflow ${path}: scrollWidth ${w}`);
  ok(t.csp.length === 0, `no CSP violations ${path}: ${t.csp}`);
  await t.pg.close();
}
const topNav = t => t.nav.filter(u => !u.startsWith(base));
const realIndex = readFileSync("index.html", "utf8");
// JS redirect alone (meta refresh removed).
{
  overrides["index.html"] = realIndex.replace(/<meta http-equiv="refresh"[^>]*>/, "");
  const t = await open("/"); await t.go(); await new Promise(r => setTimeout(r, 500));
  ok(topNav(t).join() === DEST, `JS redirect alone goes to destination: ${topNav(t)}`);
  ok(t.external.every(u => u.startsWith(DEST)) && t.csp.length === 0, `JS only: no stray external requests/CSP: ${t.external} ${t.csp}`);
  await t.pg.close();
}
// Meta refresh alone (JS off).
{
  overrides["index.html"] = realIndex;
  const t = await open("/", { js: false }); await t.go(); await new Promise(r => setTimeout(r, 500));
  ok(topNav(t).join() === DEST, `meta refresh alone goes to destination: ${topNav(t)}`);
  await t.pg.close();
}
// Mutation checks: a wrong destination in either mechanism must be detected.
{
  overrides["index.html"] = realIndex.replace(/<meta http-equiv="refresh"[^>]*>/, "");
  overrides["redirect.js"] = 'window.location.replace("https://evil.example/");';
  const t = await open("/"); await t.go(); await new Promise(r => setTimeout(r, 500));
  ok(topNav(t).join() !== DEST && t.external.some(u => u.includes("evil.example")), "mutation: wrong JS destination is detected");
  await t.pg.close(); delete overrides["redirect.js"];
  overrides["index.html"] = realIndex.replace(/(http-equiv="refresh" content="0; url=)[^"]*/, "$1https://evil.example/");
  const t2 = await open("/", { js: false }); await t2.go(); await new Promise(r => setTimeout(r, 500));
  ok(topNav(t2).join() !== DEST && t2.external.some(u => u.includes("evil.example")), "mutation: wrong meta refresh destination is detected");
  await t2.pg.close(); delete overrides["index.html"];
}
// Back button: after the redirect, Back must return to the previous page, not re-enter the redirect page.
{
  const t = await open("/robots.txt"); await t.go();
  await t.pg.goto(base + "/", { waitUntil: "load" }).catch(() => {}); await new Promise(r => setTimeout(r, 500));
  ok(t.pg.url().startsWith(DEST), `redirected: ${t.pg.url()}`);
  await t.pg.goBack().catch(() => {});
  ok(t.pg.url() === base + "/robots.txt", `Back skips the redirect page: ${t.pg.url()}`);
  await t.pg.close();
}
// Noscript text is truthful and present.
{
  const html = readFileSync("index.html", "utf8");
  ok(html.includes("If you are not redirected, use the link above."), "noscript text is accurate");
  ok(!/not being redirected automatically/.test(html), "old inaccurate noscript text removed");
}
{
  const t = await open("/", { js: false, abort: true }); await t.go();
  const href = await t.pg.$eval("main a", a => a.href);
  ok(href === DEST, `fallback link href ${href}`);
  await t.pg.keyboard.press("Tab");
  ok(await t.pg.evaluate(() => document.activeElement.tagName) === "A", "link keyboard focusable");
  await t.pg.close();
}
await browser.close(); srv.close();
console.log(`browser (${exe.split("/").pop()}): ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
