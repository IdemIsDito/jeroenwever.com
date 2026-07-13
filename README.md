# jeroenwever.com

Bilingual (EN/NL) resume site for Jeroen Wever — live at [jeroenwever.com](https://jeroenwever.com).
Static Astro site; the resume lives in zod-validated JSON that drives the pages, the
build-time-generated PDF CVs, the OG images, and `llms.txt` — one source of truth for all of it.

Built with Astro 5 + Bun and vanilla modern CSS (custom properties, native nesting,
`light-dark()` — no CSS framework). Notable bits:

- **WCAG 2.2 AA enforced in CI**: axe scans both locales in both color schemes on every push.
- **Theme system**: `prefers-color-scheme` by default, user override persisted, applied pre-paint.
- **PDF CVs** rendered from the same content at build time (tagged, language metadata set).
- **Scroll-driven header collapse** in pure CSS, with graceful fallback and reduced-motion respect.
- **CI as the gatekeeper**: typecheck → unit tests → build → smoke/behavior/a11y tests → deploy
  (Cloudflare Pages; SHA-pinned third-party actions, Dependabot-maintained).

## Develop

```bash
bun install
bunx playwright install chromium   # once, for PDF generation and a11y tests
bun run dev                        # http://localhost:4321
```

## Test

```bash
bun run check       # astro typecheck
bun run test:unit   # content schema + i18n
bun run build       # site + cv-*.pdf + og-*.png into dist/
bun run test:site   # smoke, assets, theme behavior, mobile layout, axe (WCAG 2.2 AA)
```

## Update the resume

Edit `src/content/resume.en.json` and `src/content/resume.nl.json`. The zod schema in
`src/content/schema.ts` validates both at build time. UI labels live in `src/i18n/`.
Colors and typography are tokens in `src/styles/tokens.css`.

## Deploy

Every push runs CI (`.github/workflows/ci.yml`). Green builds deploy to Cloudflare
Pages: `main` → production (jeroenwever.com), other branches → preview URLs.

One-time Cloudflare setup:

1. `bunx wrangler login`
2. `bunx wrangler pages project create jeroenwever-com --production-branch main`
3. In the GitHub repo settings, add secrets `CLOUDFLARE_API_TOKEN`
   (API token with the "Cloudflare Pages — Edit" permission) and `CLOUDFLARE_ACCOUNT_ID`.
4. In the Cloudflare dashboard → Pages → jeroenwever-com → Custom domains,
   add `jeroenwever.com` and `www.jeroenwever.com` (www set to redirect).

## License

The **code** is [MIT licensed](LICENSE) — take whatever is useful.

The **content is not**: the resume text (`src/content/*.json`), personal data, the
`jeroenwever.` wordmark, and the Sugar Rush Development name and slogan remain
© Jeroen Wever, all rights reserved. If you fork this for your own site, bring your
own resume — you'll interview better as yourself anyway.
