# Release notes

Visitors still land on https://ezzyousef-site.vercel.app/ instantly. Changes:
- Accessible fallback page: heading, visible link, message when JavaScript is off, keyboard focus ring, dark mode.
- Strict Content-Security-Policy and no-referrer policy (meta tags); no inline scripts or styles; no third-party resources.
- Description and Open Graph metadata; canonical to the destination.
- New 404 page; robots.txt.
- Payload grew from 885 B to 3.2 KB across four files. Still no build step and no runtime dependencies.
- Dev-only tests: `npm install && npm test`.

Security note: GitHub Pages cannot send HTTP headers or a true 301; see UPGRADE_AUDIT.md. Migration: none. Rollback: revert the branch commits or simply do not merge; main is untouched.
