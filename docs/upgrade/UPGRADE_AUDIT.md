# Upgrade audit: ezzyousef.github.io (repo 14)

Baseline commit: d0c85bb on main. Branch: upgrade/14-ezzyousef-github-io.

## What the repo is
One file, `index.html` (885 B): canonical link, `meta refresh` (0 s) and an inline `location.replace` to https://ezzyousef-site.vercel.app/, plus a one-line "moved" message. No build, no tests, no dependencies. Git history shows it used to hold a full portfolio that was replaced by this redirect.

## Baseline (before changes)
| Check | Result |
|---|---|
| Build | none (static) |
| Tests / lint / link check | none existed |
| html-validate (recommended) | 1 error: doctype-style |
| New static test suite on old page | 13 passed, 23 failed (missing description, CSP, OG, noscript, h1/main, 404, robots, noopener) |
| Page weight | 885 B |

## Findings
| ID | Area | Finding | Status |
|---|---|---|---|
| F1 | Security | No CSP; inline script and style prevent a strict CSP | Fixed: external `redirect.js` and `style.css`, CSP meta `default-src 'none'; script-src 'self'; style-src 'self'; base-uri 'none'; form-action 'none'` |
| F2 | Security | No referrer policy | Fixed: `no-referrer` meta |
| F3 | Accessibility | No landmark, no h1, no noscript text, no focus style | Fixed: `main`, `h1`, `noscript` message, focus-visible outline, target size over 24 px |
| F4 | SEO | No description, no Open Graph | Fixed (OG points at the destination) |
| F5 | Correctness | No 404 page; broken URLs showed the GitHub default | Fixed: `404.html` (noindex, link to destination) |
| F6 | SEO | No robots.txt | Added (allow all). No sitemap on purpose: a sitemap listing a redirect stub is counter-productive |
| F7 | Redirect | `location.replace` avoids adding a history entry; kept | Verified by a headless Edge history test (Back from the destination returns to the previous page); other browsers not tested |
| F8 | Validity | Lowercase doctype | Fixed |
| F9 | Process | No tests | Added (see test report) |

## Redirect semantics and limits (GitHub Pages)
- GitHub Pages cannot send an HTTP 301/302 or custom headers. The only mechanisms are `meta refresh`, JavaScript and a canonical link. Search engines generally treat a 0-second meta refresh as a permanent redirect and the canonical tag as a consolidation hint, but this is not guaranteed and is not equivalent to a server 301.
- CSP can only be delivered as a `<meta>` tag; `frame-ancestors`, `report-uri` and `sandbox` are ignored in meta. X-Frame-Options and X-Content-Type-Options cannot be set. GitHub Pages already serves HTTPS.
- A visible link plus `noscript` text covers users and crawlers that run neither.
- Not claimed: any server-side redirect, any header beyond what the meta CSP gives.

## Owner decisions
1. **Destination**: kept `https://ezzyousef-site.vercel.app/` exactly as the owner had it. Not changed. If a custom domain is planned, change the URL in `index.html`, `redirect.js` and `tests/*.mjs`.
2. **Overlap with ezzyousef-site**: this repo is only a pointer to the site built from repo `ezzyousef-site` (repo 13). Neither was deleted. Decide whether to keep the github.io pointer (useful for existing `ezzyousef.github.io` links) or retire it. The destination is a `*.vercel.app` URL, which depends on that Vercel project name staying unchanged.
3. The old portfolio content lives in git history (commits before d0c85bb); it was not restored.
4. I could not confirm the destination is live: network access beyond git push and npm was out of scope, so no live-homepage probe was run.

## Not done and why
- Sitemap: deliberately omitted (above).
- Live homepage monitoring: needs network access and a scheduler; documented as a manual `curl -I` step in the README.
- HTTP security headers: impossible on GitHub Pages.
