# Implementation plan

Constraint: stay tiny, no build system, no runtime dependencies. npm is for dev tests only.

1. Milestone A (correctness/security, test first): add `tests/static.test.mjs` (metadata, CSP, redirect, links, weight), `tests/browser.test.mjs` (axe WCAG 2.2 AA, 360 px overflow, redirect target, keyboard, CSP violations) and html-validate. Commit the failing baseline.
2. Move script and style into `redirect.js` and `style.css`; add CSP and referrer meta.
3. Milestone B/C: accessible fallback (main, h1, visible link, noscript, focus ring, dark mode), `404.html`, description and Open Graph.
4. Milestone E: `robots.txt`, README with one-command test and deploy guide, the five reports.

Acceptance: `npm test` passes; page payload under 8 KiB; no third-party resources; destination unchanged.
Rollback: `git revert` the branch commits, or do not merge; main is untouched.
