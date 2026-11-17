// Static checks: metadata, redirect semantics, security, local links, page weight. No dependencies.
import { readFileSync, existsSync, statSync } from "node:fs";
const DEST = "https://ezzyousef-site.vercel.app/";
let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error("FAIL:", m); } };
const read = f => readFileSync(f, "utf8");

for (const f of ["index.html", "404.html", "style.css", "redirect.js", "robots.txt"]) ok(existsSync(f), `${f} exists`);
const html = existsSync("index.html") ? read("index.html") : "", nf = existsSync("404.html") ? read("404.html") : "";
for (const [name, h] of [["index", html], ["404", nf]]) {
  ok(/<html lang="en"/.test(h), `${name}: lang`);
  ok(/<title>[^<]{3,}<\/title>/.test(h), `${name}: title`);
  ok(/name="viewport"/.test(h), `${name}: viewport`);
  ok(/<meta name="description" content="[^"]{20,}"/.test(h), `${name}: description`);
  ok(/Content-Security-Policy/.test(h) && /default-src 'none'/.test(h) && /script-src 'self'/.test(h), `${name}: CSP meta`);
  ok(/name="referrer" content="no-referrer"/.test(h), `${name}: referrer policy`);
  ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(h), `${name}: no inline script`);
  ok(!/\sstyle=|<style/.test(h), `${name}: no inline style`);
  ok(/<main/.test(h) && /<h1/.test(h), `${name}: landmark and h1`);
}
ok(/<noscript/.test(html) || /<main/.test(html), "index: content visible without JS");
ok(html.includes(`<link rel="canonical" href="${DEST}">`), "canonical points at destination");
ok(html.includes(`http-equiv="refresh" content="0; url=${DEST}"`), "meta refresh to destination");
ok(new RegExp(`<a\\b[^>]*href="${DEST}"`).test(html), "visible destination link");
ok(/property="og:title"/.test(html) && html.includes(`property="og:url" content="${DEST}"`), "Open Graph present");
const js = existsSync("redirect.js") ? read("redirect.js") : "";
ok(js.includes(DEST) && /location\.replace/.test(js), "redirect.js uses location.replace (no history loop)");
ok(!/location\.(href|assign)\s*=/.test(js), "no history-polluting redirect");
ok(!/ezzyousef\.github\.io/.test(js), "no self-redirect to github.io");
for (const h of [html, nf]) {
  for (const m of h.matchAll(/<a\b[^>]*href="(https?:[^"]+)"[^>]*>/g)) {
    ok(m[1].startsWith("https://"), `https link ${m[1]}`);
    ok(/rel="[^"]*noopener/.test(m[0]), `noopener ${m[1]}`);
  }
  for (const m of h.matchAll(/<(?:script|img|iframe)\b[^>]*src="(https?:[^"]+)"/g)) ok(false, `third-party resource ${m[1]}`);
  for (const m of h.matchAll(/<link\b[^>]*href="(https?:[^"]+)"/g)) ok(/rel="canonical"/.test(m[0]), `third-party link ${m[1]}`);
  for (const m of h.matchAll(/(?:src|href)="(?!https?:|#|mailto:)([^"]+)"/g)) ok(existsSync(m[1].replace(/^\//, "")), `local ref ${m[1]} resolves`);
}
ok(existsSync("robots.txt") && /Disallow:\s*$/m.test(read("robots.txt")), "robots.txt allows crawling");
const bytes = ["index.html", "404.html", "style.css", "redirect.js"].reduce((n, f) => n + (existsSync(f) ? statSync(f).size : 1e9), 0);
ok(bytes < 8192, `total payload ${bytes} B < 8 KiB`);
console.log(`static: ${pass} passed, ${fail} failed, payload ${bytes} B`);
process.exit(fail ? 1 : 0);
