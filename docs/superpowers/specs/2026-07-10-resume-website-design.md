# Resume Website — Design Spec

**Date:** 2026-07-10
**Project:** jeroenwever.com — bilingual resume site for Jeroen Wever, freelance staff engineer
**Status:** Approved design, pending implementation plan

## 1. Purpose & goals

A single-page resume website whose job is to land the next freelance assignment. It positions Jeroen as a staff-level engineer: the site itself must demonstrate craft (performance, accessibility, clean repo) as much as the content does.

**Success criteria:**

- A recruiter or client can grasp who Jeroen is, what he's done, and how to reach him within seconds.
- Lighthouse: 100 (or near) on performance, accessibility, best practices, SEO.
- WCAG 2.2 AA compliant.
- Updating the resume means editing one data file per language; site and PDF stay in sync automatically.

**Out of scope for v1:** portfolio/case studies, blog, contact form, booking link, CMS, analytics.

## 2. Key decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | Resume only | Fast to ship; extend later |
| Languages | English + Dutch, toggle | Dutch and international clients |
| Contact CTAs | Email, LinkedIn, PDF CV download | Zero backend, recruiter-friendly. Booking link deferred |
| Framework | Astro (static output) | Right tool for a content site; ships ~zero JS |
| Runtime / package manager | Bun | User preference; supported by Cloudflare Pages |
| Styling | Modern vanilla CSS (custom properties, native nesting, Astro scoped styles). No Tailwind | User preference |
| Hosting | Cloudflare Pages @ jeroenwever.com | Free, fast CDN, deploy on push |
| Content architecture | Typed data files + Astro built-in i18n (Approach 1) | One source of truth for site, PDF, both locales |
| Design direction | Editorial minimal (light, typographic), warm accent color, dark mode | Chosen from visual mockups |
| Layout | Sticky sidebar (identity + CTAs) + scrolling content | Chosen from visual mockups |
| PDF CV | Generated at build time from the same content | Never out of sync; EN + NL for free |
| Content source | User supplies CV/LinkedIn; structured into data files during implementation | — |

## 3. Architecture

Static Astro site, no server-side runtime. GitHub → Cloudflare Pages, build on push to `main`, preview deployments per branch.

```
resume-site/
├── src/
│   ├── content/
│   │   ├── resume.en.json      # resume content, structured
│   │   ├── resume.nl.json
│   │   └── schema.ts           # zod schema validating both at build time
│   ├── i18n/
│   │   ├── en.ts / nl.ts       # UI strings ("Experience", "Download CV", …)
│   │   └── index.ts            # t() helper, locale types
│   ├── components/             # Sidebar, ExperienceItem, SkillsList, SectionHeading, …
│   ├── styles/tokens.css       # design tokens: colors, type scale, spacing
│   ├── layouts/Base.astro      # fonts, meta, OG, JSON-LD, skip link
│   └── pages/
│       ├── index.astro         # EN at /
│       ├── nl/index.astro      # NL at /nl/
│       └── cv/[locale].astro   # print-styled route, source for PDFs
├── scripts/generate-pdf.ts     # post-build: Playwright renders /cv/* → PDF
├── public/                     # favicon, og-image; build adds cv-en.pdf, cv-nl.pdf
└── astro.config.mjs            # i18n: defaultLocale en, locales [en, nl]
```

**Component contract:** components are locale-agnostic. They receive a validated `Resume` object and a locale dictionary and render; they never import content directly. Pages (`index.astro`, `nl/index.astro`) are thin: pick locale data, pass down.

## 4. Content model

Zod schema, roughly:

- `basics` — name, title, payoff/tagline, summary, location, email, linkedin URL
- `experience[]` — role, company/client, period (start/end), summary, highlights[], stack[]
- `skills[]` — grouped (languages, frameworks, practices, …)
- `education[]` / `certifications[]` — optional

Validation runs at build time: invalid content fails the build, never ships. The schema is shared by the web pages and the PDF route.

## 5. Page design

**Design direction:** editorial minimal. Warm off-white background (≈`#fafaf8`), near-black text, serif headings in **Fraunces** (self-hosted, subset woff2) — an expressive editorial serif, chosen because typography carries the personality of this design, clean sans-serif body. One warm accent color (starting point: amber ≈`#b45309`) used for section labels, links, small flourishes. All colors defined as CSS custom properties in `tokens.css` so accent/palette changes are one-variable edits ("more color later" is anticipated).

**Dark mode:** respects `prefers-color-scheme`; inverted palette from the same tokens. All contrast requirements apply to both modes.

**Layout (desktop):**

- **Sticky sidebar (left):** name in large serif; "Freelance staff engineer"; tagline *"I build products that ship."* as supporting text (not the main headline); action list: Email (mailto), LinkedIn, Download CV (locale-matched PDF); EN/NL toggle at the bottom.
- **Content (right, scrolls):** short intro paragraph → Experience (role, client, period, 2–3 highlights, stack) → Skills (grouped) → Education/certs (if provided) → closing contact nudge.

**Mobile:** sidebar collapses to a compact header; contact actions remain reachable via a small sticky footer bar.

**Language toggle:** links between `/` and `/nl/` (same page, other locale), keyboard-operable, with `hreflang` alternates in the head.

## 6. Accessibility (WCAG 2.2 AA) — requirement, not nice-to-have

- Semantic HTML: landmarks (`header`, `nav`, `main`, `footer`), single `h1`, correct heading order.
- Skip-to-content link.
- Visible focus states on all interactive elements (`:focus-visible`, styled with the design, not suppressed).
- Color contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text — verified for every text/background combination in **both** light and dark mode. The amber accent is adjusted per mode if needed to pass.
- Language toggle and sticky footer bar fully keyboard-operable; correct `lang` attributes (`lang="en"` / `lang="nl"`, plus `hreflang` on toggle links).
- `prefers-reduced-motion` respected for any transitions/animations.
- Images (og-image aside) have alt text; decorative flourishes are `aria-hidden`.
- Touch targets ≥ 24×24px (WCAG 2.2 target size).
- Automated axe scan in CI on both locales; manual keyboard + screen-reader pass before launch.

## 7. PDF CV generation

- `/cv/en` and `/cv/nl` render the same resume data with print-oriented CSS (A4 proportions, tighter spacing, no interactive chrome, print-safe colors).
- Post-build script (`scripts/generate-pdf.ts`) runs Playwright headless Chromium against the built output and writes `cv-en.pdf` / `cv-nl.pdf` into the deploy directory.
- "Download CV" links to the current locale's PDF.
- PDF generation failure fails the build — stale CVs never ship silently.
- The PDF is real text (selectable, searchable), with document title and language metadata set. Note: browser-printed PDFs are not fully tagged PDFs (PDF/UA); accepted limitation for v1 — the website itself is the accessible medium.

## 8. SEO & metadata

- Per-locale title/description; canonical URLs; `hreflang` pairs (`en`, `nl`, `x-default`).
- Open Graph + Twitter card with a designed og-image (link looks good on LinkedIn).
- JSON-LD `Person` structured data (name, job title, url, sameAs → LinkedIn).
- Sitemap + robots.txt.

## 9. Build, CI & deployment

- **Toolchain:** Bun as package manager and script runner; Astro static build.
- **CI (GitHub Actions):** on every push — typecheck (strict TS), content schema validation, build, PDF generation, smoke tests, axe a11y scan, link check on CTAs. Deploy only if green.
- **Hosting:** Cloudflare Pages, custom domain `jeroenwever.com` + `www` redirect, HTTPS. Preview URL per branch.

## 10. Testing

Static site → quality is enforced at build time:

- Zod schema validation of both locale content files.
- TypeScript strict mode.
- Smoke tests: both locales render name, experience section, and all three CTAs; both PDFs exist and are non-empty.
- axe-core scan of both locales (fails CI on violations).
- Link check: mailto, LinkedIn URL, PDF paths resolve.
- Manual pre-launch pass: keyboard-only navigation, VoiceOver spot check, mobile viewport, dark mode.

## 11. Implementation notes

- Real resume content: user supplies CV/LinkedIn; content is structured into `resume.en.json` / `resume.nl.json` during implementation. Placeholder content may be used to build structure first, but launch blocks on real content.
- Fonts self-hosted (no third-party requests — privacy and performance).
- `.superpowers/` (brainstorm artifacts) stays out of git via `.gitignore`.
