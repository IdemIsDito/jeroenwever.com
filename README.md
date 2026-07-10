# jeroenwever.com

Bilingual (EN/NL) resume site for Jeroen Wever. Static Astro site; content lives in
zod-validated JSON and drives both the pages and the build-time-generated PDF CVs.

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
bun run test:site   # smoke, assets, theme behavior, axe (WCAG 2.2 AA)
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
