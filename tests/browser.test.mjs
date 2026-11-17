// Headless Edge/Chrome: axe WCAG 2.2 AA, 360px overflow, redirect target, keyboard. Offline: destination requests are intercepted.
import puppeteer from "puppeteer-core";
import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname } from "node:path";
const axeSrc = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const exe = [process.env.CHROME_PATH, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].find(p => p && existsSync(p));
if (!exe) { console.error("SKIP: no local Chromium-based browser found"); process.exit(0); }
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".txt": "text/plain" };
const srv = createServer((q, r) => {
  const p = q.url === "/" ? "index.html" : q.url.split("?")[0].slice(1);
  if (!existsSync(p)) { r.writeHead(404, { "content-type": "text/html" }); return r.end(readFileSync("404.html")); }
  r.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" }); r.end(readFileSync(p));
}).listen(0);
const base = `http://127.0.0.1:${srv.address().port}`;
const DEST = "https://ezzyousef-site.vercel.app/";
let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error("FAIL:", m); } };
const browser = await puppeteer.launch({ executablePath: exe, headless: true });
async function open(path, { js = true, dark = false } = {}) {
  const pg = await browser.newPage();
  await pg.setJavaScriptEnabled(js);
  await pg.setViewport({ width: 360, height: 640 });
  await pg.emulateMediaFeatures([{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }]);
  const nav = [], csp = [];
  await pg.setRequestInterception(true);
  pg.on("request", r => {
    if (r.url().startsWith(DEST)) { nav.push(r.url()); r.respond({ status: 200, contentType: "text/html", body: "<title>dest</title>" }); }
    else r.continue();
  });
  pg.on("console", m => /Content Security Policy/i.test(m.text()) && csp.push(m.text()));
  return { pg, nav, csp, go: () => pg.goto(base + path, { waitUntil: "load" }).catch(() => {}) };
}
// JS disabled so the fallback page itself is what gets audited (JS-enabled pages navigate away).
for (const path of ["/", "/definitely-missing"]) for (const dark of [false, true]) {
  const t = await open(path, { js: false, dark }); await t.go();
  await t.pg.addScriptTag({ content: axeSrc }).catch(() => {});
  const res = await t.pg.evaluate(() => axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] }));
  ok(res.violations.length === 0, `axe ${path} dark=${dark}: ${res.violations.map(v => v.id + ":" + v.nodes.length).join(",")}`);
  const w = await t.pg.evaluate(() => document.documentElement.scrollWidth);
  ok(w <= 360, `360px overflow ${path}: scrollWidth ${w}`);
  ok(t.csp.length === 0, `no CSP violations ${path}: ${t.csp}`);
  await t.pg.close();
}
{
  const t = await open("/"); await t.go(); await new Promise(r => setTimeout(r, 400));
  ok(t.nav.length >= 1 && t.nav.every(u => u === DEST), `redirect hits destination only: ${t.nav}`);
  ok(t.csp.length === 0, `no CSP violations with JS: ${t.csp}`);
  await t.pg.close();
}
{
  const t = await open("/", { js: false }); await t.go();
  const href = await t.pg.$eval("main a", a => a.href);
  ok(href === DEST, `fallback link href ${href}`);
  await t.pg.keyboard.press("Tab");
  ok(await t.pg.evaluate(() => document.activeElement.tagName) === "A", "link keyboard focusable");
  await t.pg.close();
}
await browser.close(); srv.close();
console.log(`browser (${exe.split("/").pop()}): ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
