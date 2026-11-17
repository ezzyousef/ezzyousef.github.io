# Test report

Environment: Windows 11, Node v25.9.0, Microsoft Edge (headless, via puppeteer-core 24.4.0), axe-core 4.10.2, html-validate 9.5.5.

| Command | Before (old index.html) | After |
|---|---|---|
| `node tests/static.test.mjs` | 13 passed, 23 failed | 41 passed, 0 failed, payload 3193 B |
| `npx html-validate index.html 404.html` | 1 error (doctype-style) | 0 errors |
| `node tests/browser.test.mjs` | not run (files absent) | 16 passed, 0 failed |
| `npm test` (all three) | n/a | pass |

Browser test covers: axe (wcag2a, 2aa, 21aa, 22aa, best-practice) on `/` and a 404 page in light and dark; no horizontal overflow at 360 px; no CSP violations in the console; with JS enabled the page navigates only to https://ezzyousef-site.vercel.app/ (destination intercepted, offline); without JS the link href is correct and focusable by Tab.

Not run: live check of the destination site (no network by instruction); real GitHub Pages rendering after deploy; Safari/Firefox; screen readers; Lighthouse. The 404 page was tested through a local server emulating Pages behavior, not on Pages itself.
