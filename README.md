# ezzyousef.github.io

Tiny redirect and fallback page. Visitors are sent to https://ezzyousef-site.vercel.app/ (meta refresh, `location.replace`, canonical link, visible link). It is not a portfolio; do not duplicate the site here.

Files: `index.html`, `404.html`, `style.css`, `redirect.js`, `robots.txt`. No build step, no runtime dependencies.

## Test (one command)
    npm install && npm test

Runs static metadata/security/link checks, html-validate, and a headless Edge/Chrome run (axe WCAG 2.2 AA, 360 px overflow, redirect target). Set `CHROME_PATH` if no browser is auto-detected. The tests never touch the network.

## Deploy
GitHub Pages serves `main` from the repository root. After review and owner approval, merge the branch into `main` and push:

    npm test && git push origin main

Pages publishes within about a minute. Then check manually: `curl -sI https://ezzyousef.github.io/`, open the page in a browser, and confirm the destination answers with `curl -sI https://ezzyousef-site.vercel.app/`.

## Changing the destination
Edit the URL in `index.html` (canonical, refresh, og:url, link), `redirect.js`, and the `DEST` constant in `tests/static.test.mjs` and `tests/browser.test.mjs`, then run `npm test`.

## Limits
GitHub Pages cannot send HTTP redirects or custom headers; the CSP is a meta tag. See `docs/upgrade/UPGRADE_AUDIT.md`.
