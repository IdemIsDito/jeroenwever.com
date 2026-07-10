# Resume Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy jeroenwever.com — a bilingual (EN/NL), WCAG 2.2 AA compliant, static resume site with build-time-generated PDF CVs.

**Architecture:** Static Astro 5 site. Resume content lives in zod-validated JSON (one file per locale); locale-agnostic components render whichever locale's data they receive. A post-build script renders print routes to PDF with Playwright. GitHub Actions builds, tests (unit + smoke + axe), and deploys to Cloudflare Pages.

**Tech Stack:** Astro 5, Bun (runtime/package manager/test runner), zod 4, vanilla modern CSS (custom properties, nesting, `light-dark()`), Playwright, @axe-core/playwright, Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-07-10-resume-website-design.md`

## Global Constraints

- Bun for everything: `bun install`, `bun run`, `bun test`, `bunx`. Never npm/yarn/pnpm.
- Astro static output (no adapter). `site: 'https://jeroenwever.com'`.
- Locales: `en` (default, served at `/`) and `nl` (served at `/nl/`).
- Styling: vanilla CSS only — custom properties, native nesting, `light-dark()`. **No Tailwind, no CSS frameworks.** All colors come from tokens in `src/styles/tokens.css`; never hardcode a color in a component (print/OG routes excepted — they force light values).
- WCAG 2.2 AA: axe scans (`wcag2a, wcag2aa, wcag21aa, wcag22aa` tags) must report **zero violations** on both locales in both color schemes.
- TypeScript strict (`astro/tsconfigs/strict`). `bunx astro check` must pass.
- No external requests at runtime: fonts self-hosted via `@fontsource-variable/fraunces`.
- Theme: system preference is default; user override via toggle, persisted in `localStorage` under key `theme` (values `light`/`dark`; absence = system).
- Tests live in `tests/unit/` (pure, no build needed) and `tests/site/` (require `bun run build` first).
- Commit after every green test cycle. Do not commit `dist/`, `node_modules/`, `.astro/` (already gitignored).

---

### Task 1: Project scaffold & toolchain

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `src/pages/index.astro` (temporary placeholder, replaced in Task 5)
- Create: `public/robots.txt`
- Modify: `.gitignore` (verify `node_modules/`, `dist/`, `.astro/` present — they already are)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a building Astro project; scripts `dev`, `build`, `preview`, `check`, `test:unit`, `test:site` that all later tasks use.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "jeroenwever.com",
  "type": "module",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test:unit": "bun test tests/unit",
    "test:site": "bun test tests/site"
  },
  "dependencies": {
    "@astrojs/sitemap": "^3.2.0",
    "@fontsource-variable/fraunces": "^5.1.0",
    "astro": "^5.0.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "@axe-core/playwright": "^4.10.0",
    "playwright": "^1.49.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Write `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://jeroenwever.com',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'nl'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    // /cv/ and /og/ are print/OG source routes, not destination pages
    sitemap({ filter: (page) => !page.includes('/cv/') && !page.includes('/og/') }),
  ],
});
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "src/**/*", "tests/**/*", "scripts/**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 4: Write placeholder `src/pages/index.astro`**

```astro
---
// Temporary placeholder — replaced by the real page in Task 5.
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Jeroen Wever</title>
  </head>
  <body>
    <main><h1>Jeroen Wever</h1></main>
  </body>
</html>
```

- [ ] **Step 5: Write `public/robots.txt`**

```
User-agent: *
Allow: /

Sitemap: https://jeroenwever.com/sitemap-index.xml
```

- [ ] **Step 6: Install and verify build**

Run: `bun install`
Expected: lockfile `bun.lock` created, no errors.

Run: `bun run build`
Expected: `Complete!` output; `dist/index.html` and `dist/sitemap-index.xml` exist.

Run: `bun run check`
Expected: `0 errors, 0 warnings` (hints are acceptable).

- [ ] **Step 7: Commit**

```bash
git add package.json bun.lock astro.config.mjs tsconfig.json src/pages/index.astro public/robots.txt
git commit -m "feat: scaffold Astro 5 project with Bun toolchain"
```

---

### Task 2: Content schema & resume data

**Files:**
- Create: `src/content/schema.ts`
- Create: `src/content/resume.en.json`
- Create: `src/content/resume.nl.json`
- Create: `src/content/index.ts`
- Test: `tests/unit/content.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `getResume(locale: 'en' | 'nl'): Resume` from `src/content/index.ts`; type `Resume` from `src/content/schema.ts` with shape `{ basics: { name, title, tagline, summary, location, email, linkedin }, experience: Array<{ role, company, start, end, summary, highlights, stack }>, skills: Array<{ group, items }>, education: Array<{ degree, school, year }> }`.

- [ ] **Step 1: Write the failing test `tests/unit/content.test.ts`**

```ts
import { describe, test, expect } from 'bun:test';
import { resumeSchema } from '../../src/content/schema';
import { getResume } from '../../src/content';

describe('resume content', () => {
  test('both locale files satisfy the schema', () => {
    expect(() => getResume('en')).not.toThrow();
    expect(() => getResume('nl')).not.toThrow();
  });

  test('schema rejects invalid content', () => {
    const result = resumeSchema.safeParse({ basics: { name: '' } });
    expect(result.success).toBe(false);
  });

  test('schema rejects malformed email and dates', () => {
    const valid = getResume('en');
    expect(
      resumeSchema.safeParse({
        ...valid,
        basics: { ...valid.basics, email: 'not-an-email' },
      }).success
    ).toBe(false);
    expect(
      resumeSchema.safeParse({
        ...valid,
        experience: [{ ...valid.experience[0], start: 'March 2022' }],
      }).success
    ).toBe(false);
  });

  test('locales have the same shape (same number of jobs and skill groups)', () => {
    const en = getResume('en');
    const nl = getResume('nl');
    expect(nl.experience.length).toBe(en.experience.length);
    expect(nl.skills.length).toBe(en.skills.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit`
Expected: FAIL — `Cannot find module '../../src/content/schema'`.

- [ ] **Step 3: Write `src/content/schema.ts`**

```ts
import { z } from 'zod';

// Year or year-month, e.g. "2022" or "2022-03"
const yearMonth = z.string().regex(/^\d{4}(-\d{2})?$/);

export const resumeSchema = z.object({
  basics: z.object({
    name: z.string().min(1),
    title: z.string().min(1),
    tagline: z.string().min(1),
    summary: z.string().min(1),
    location: z.string().min(1),
    email: z.email(),
    linkedin: z.url(),
  }),
  experience: z
    .array(
      z.object({
        role: z.string().min(1),
        company: z.string().min(1),
        start: yearMonth,
        end: yearMonth.nullable(), // null = current position
        summary: z.string().min(1),
        highlights: z.array(z.string().min(1)).min(1),
        stack: z.array(z.string().min(1)),
      })
    )
    .min(1),
  skills: z
    .array(
      z.object({
        group: z.string().min(1),
        items: z.array(z.string().min(1)).min(1),
      })
    )
    .min(1),
  education: z
    .array(
      z.object({
        degree: z.string().min(1),
        school: z.string().min(1),
        year: z.string().min(1),
      })
    )
    .default([]),
});

export type Resume = z.infer<typeof resumeSchema>;
```

- [ ] **Step 4: Write `src/content/resume.en.json`**

Placeholder content (structure is real; copy is replaced with Jeroen's actual CV in Task 10):

```json
{
  "basics": {
    "name": "Jeroen Wever",
    "title": "Freelance staff engineer",
    "tagline": "I build products that ship.",
    "summary": "Staff-level engineer with 15+ years of shipping web products — from jQuery and Knockout to React, Vue and Svelte. I pick the right tool for the product, raise the bar on quality, and help teams deliver.",
    "location": "The Netherlands",
    "email": "jeroen@jeroenwever.com",
    "linkedin": "https://www.linkedin.com/in/jeroenwever"
  },
  "experience": [
    {
      "role": "Staff Engineer (PLACEHOLDER)",
      "company": "Acme Corp",
      "start": "2022-03",
      "end": null,
      "summary": "Led the platform rebuild for Acme's customer-facing product suite.",
      "highlights": [
        "Cut deployment lead time from days to minutes by rebuilding CI/CD",
        "Mentored a team of 8 engineers across three product squads",
        "Drove the migration from a legacy monolith to a modular architecture"
      ],
      "stack": ["TypeScript", "Vue", "Node.js", "PostgreSQL"]
    },
    {
      "role": "Lead Developer (PLACEHOLDER)",
      "company": "Example B.V.",
      "start": "2019-01",
      "end": "2022-02",
      "summary": "Shipped v2 of the customer portal used by 200k+ users.",
      "highlights": [
        "Rebuilt the front end from Knockout to React with zero downtime",
        "Introduced automated accessibility testing into the release pipeline"
      ],
      "stack": ["React", "TypeScript", ".NET"]
    }
  ],
  "skills": [
    { "group": "Languages", "items": ["TypeScript", "JavaScript", "HTML", "CSS", "SQL"] },
    { "group": "Frameworks", "items": ["React", "Vue", "Svelte", "Astro", "Node.js"] },
    { "group": "Practices", "items": ["Accessibility (WCAG)", "CI/CD", "TDD", "Mentoring", "Architecture"] }
  ],
  "education": [
    { "degree": "BSc Computer Science (PLACEHOLDER)", "school": "University of Somewhere", "year": "2008" }
  ]
}
```

- [ ] **Step 5: Write `src/content/resume.nl.json`**

Same structure, Dutch copy (also placeholder):

```json
{
  "basics": {
    "name": "Jeroen Wever",
    "title": "Freelance staff engineer",
    "tagline": "Ik bouw producten die live gaan.",
    "summary": "Staff-level engineer met 15+ jaar ervaring in het bouwen van webproducten — van jQuery en Knockout tot React, Vue en Svelte. Ik kies het juiste gereedschap voor het product, til de kwaliteit omhoog en help teams leveren.",
    "location": "Nederland",
    "email": "jeroen@jeroenwever.com",
    "linkedin": "https://www.linkedin.com/in/jeroenwever"
  },
  "experience": [
    {
      "role": "Staff Engineer (PLACEHOLDER)",
      "company": "Acme Corp",
      "start": "2022-03",
      "end": null,
      "summary": "Leidde de platform-rebuild van Acme's klantgerichte productsuite.",
      "highlights": [
        "Verkortte de deployment-doorlooptijd van dagen naar minuten door CI/CD opnieuw op te zetten",
        "Mentorde een team van 8 engineers verdeeld over drie product-squads",
        "Trok de migratie van een legacy-monoliet naar een modulaire architectuur"
      ],
      "stack": ["TypeScript", "Vue", "Node.js", "PostgreSQL"]
    },
    {
      "role": "Lead Developer (PLACEHOLDER)",
      "company": "Example B.V.",
      "start": "2019-01",
      "end": "2022-02",
      "summary": "Leverde v2 van het klantportaal met 200k+ gebruikers op.",
      "highlights": [
        "Herbouwde de front-end van Knockout naar React zonder downtime",
        "Introduceerde geautomatiseerde toegankelijkheidstests in de release-pipeline"
      ],
      "stack": ["React", "TypeScript", ".NET"]
    }
  ],
  "skills": [
    { "group": "Talen", "items": ["TypeScript", "JavaScript", "HTML", "CSS", "SQL"] },
    { "group": "Frameworks", "items": ["React", "Vue", "Svelte", "Astro", "Node.js"] },
    { "group": "Werkwijze", "items": ["Toegankelijkheid (WCAG)", "CI/CD", "TDD", "Mentoring", "Architectuur"] }
  ],
  "education": [
    { "degree": "BSc Informatica (PLACEHOLDER)", "school": "Universiteit van Ergens", "year": "2008" }
  ]
}
```

- [ ] **Step 6: Write `src/content/index.ts`**

```ts
import en from './resume.en.json';
import nl from './resume.nl.json';
import { resumeSchema, type Resume } from './schema';

const raw = { en, nl } as const;

export type ResumeLocale = keyof typeof raw;

/** Parse (and thereby validate) a locale's resume. Throws on invalid content, failing the build. */
export function getResume(locale: ResumeLocale): Resume {
  return resumeSchema.parse(raw[locale]);
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `bun run test:unit`
Expected: 4 pass, 0 fail.

- [ ] **Step 8: Commit**

```bash
git add src/content tests/unit/content.test.ts
git commit -m "feat: add zod-validated resume content model with EN/NL data"
```

---

### Task 3: i18n dictionaries & helpers

**Files:**
- Create: `src/i18n/en.ts`
- Create: `src/i18n/nl.ts`
- Create: `src/i18n/index.ts`
- Test: `tests/unit/i18n.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: from `src/i18n/index.ts` — `locales: readonly ['en','nl']`, `type Locale = 'en' | 'nl'`, `type TranslationKey`, `useTranslations(locale: Locale): (key: TranslationKey) => string`, `altLocale(locale: Locale): Locale`, `localePath(locale: Locale): string` (returns `/` for en, `/nl/` for nl).

- [ ] **Step 1: Write the failing test `tests/unit/i18n.test.ts`**

```ts
import { describe, test, expect } from 'bun:test';
import en from '../../src/i18n/en';
import nl from '../../src/i18n/nl';
import { useTranslations, altLocale, localePath } from '../../src/i18n';

describe('i18n', () => {
  test('en and nl dictionaries have identical keys', () => {
    expect(Object.keys(nl).sort()).toEqual(Object.keys(en).sort());
  });

  test('no empty translations', () => {
    for (const dict of [en, nl]) {
      for (const [key, value] of Object.entries(dict)) {
        expect(value.trim().length, `empty translation for ${key}`).toBeGreaterThan(0);
      }
    }
  });

  test('useTranslations returns locale-specific strings', () => {
    expect(useTranslations('en')('section.experience')).toBe('Experience');
    expect(useTranslations('nl')('section.experience')).toBe('Werkervaring');
  });

  test('altLocale and localePath', () => {
    expect(altLocale('en')).toBe('nl');
    expect(altLocale('nl')).toBe('en');
    expect(localePath('en')).toBe('/');
    expect(localePath('nl')).toBe('/nl/');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit`
Expected: FAIL — `Cannot find module '../../src/i18n/en'`.

- [ ] **Step 3: Write `src/i18n/en.ts`**

```ts
export default {
  'nav.skip': 'Skip to content',
  'sidebar.contactNav': 'Contact',
  'sidebar.email': 'Email me',
  'sidebar.linkedin': 'LinkedIn',
  'sidebar.downloadCv': 'Download CV (PDF)',
  'mobile.contactNav': 'Quick contact',
  'section.about': 'About',
  'section.experience': 'Experience',
  'section.skills': 'Skills',
  'section.education': 'Education',
  'experience.present': 'present',
  'outro.line': 'Interested in working together? Reach me at',
  'locale.switch': 'Nederlands',
  'theme.legend': 'Theme',
  'theme.system': 'System',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'meta.description':
    'Jeroen Wever — freelance staff engineer. 15+ years shipping web products. Available for assignments.',
} as const;
```

- [ ] **Step 4: Write `src/i18n/nl.ts`**

```ts
import type en from './en';

export default {
  'nav.skip': 'Direct naar inhoud',
  'sidebar.contactNav': 'Contact',
  'sidebar.email': 'Mail mij',
  'sidebar.linkedin': 'LinkedIn',
  'sidebar.downloadCv': 'Download CV (PDF)',
  'mobile.contactNav': 'Snel contact',
  'section.about': 'Over mij',
  'section.experience': 'Werkervaring',
  'section.skills': 'Vaardigheden',
  'section.education': 'Opleiding',
  'experience.present': 'heden',
  'outro.line': 'Interesse om samen te werken? Bereik me via',
  'locale.switch': 'English',
  'theme.legend': 'Thema',
  'theme.system': 'Systeem',
  'theme.light': 'Licht',
  'theme.dark': 'Donker',
  'meta.description':
    'Jeroen Wever — freelance staff engineer. 15+ jaar ervaring met webproducten. Beschikbaar voor opdrachten.',
} satisfies Record<keyof typeof en, string>;
```

- [ ] **Step 5: Write `src/i18n/index.ts`**

```ts
import en from './en';
import nl from './nl';

export const locales = ['en', 'nl'] as const;
export type Locale = (typeof locales)[number];
export type TranslationKey = keyof typeof en;

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { en, nl };

export function useTranslations(locale: Locale) {
  return (key: TranslationKey): string => dictionaries[locale][key];
}

export function altLocale(locale: Locale): Locale {
  return locale === 'en' ? 'nl' : 'en';
}

export function localePath(locale: Locale): string {
  return locale === 'en' ? '/' : '/nl/';
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun run test:unit`
Expected: all pass (content + i18n suites).

- [ ] **Step 7: Commit**

```bash
git add src/i18n tests/unit/i18n.test.ts
git commit -m "feat: add EN/NL i18n dictionaries and locale helpers"
```

---

### Task 4: Design tokens, global styles & Base layout

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/layouts/Base.astro`
- Create: `public/favicon.svg`
- Modify: `src/pages/index.astro` (use Base layout)
- Test: `tests/site/head.test.ts`

**Interfaces:**
- Consumes: `useTranslations`, `altLocale`, `localePath`, `Locale` from `src/i18n`.
- Produces: `Base.astro` with props `{ locale: Locale; title: string; description: string }`, a default slot for the body, and a named slot `head` for extra head tags. Design tokens: `--color-bg`, `--color-text`, `--color-muted`, `--color-accent`, `--color-border`, `--font-serif`, `--font-sans`. CSS class `.visually-hidden` available globally.

- [ ] **Step 1: Write the failing test `tests/site/head.test.ts`**

```ts
import { describe, test, expect } from 'bun:test';
import { existsSync } from 'node:fs';

const dist = new URL('../../dist/', import.meta.url).pathname;
if (!existsSync(dist)) throw new Error('dist/ missing — run `bun run build` before test:site');

const en = await Bun.file(dist + 'index.html').text();

describe('document head', () => {
  test('lang attribute and charset', () => {
    expect(en).toContain('<html lang="en"');
    expect(en).toContain('charset="utf-8"');
  });

  test('canonical and hreflang alternates', () => {
    expect(en).toContain('rel="canonical" href="https://jeroenwever.com/"');
    expect(en).toContain('hreflang="nl" href="https://jeroenwever.com/nl/"');
    expect(en).toContain('hreflang="x-default"');
  });

  test('theme override script runs before paint', () => {
    // inline script must appear in <head>, before the stylesheet-dependent body
    const headEnd = en.indexOf('</head>');
    const scriptPos = en.indexOf("localStorage.getItem('theme')");
    expect(scriptPos).toBeGreaterThan(-1);
    expect(scriptPos).toBeLessThan(headEnd);
  });

  test('skip link is first element in body', () => {
    const body = en.slice(en.indexOf('<body'));
    expect(body.indexOf('skip-link')).toBeGreaterThan(-1);
    expect(body.indexOf('skip-link')).toBeLessThan(200);
  });

  test('open graph tags', () => {
    expect(en).toContain('property="og:title"');
    expect(en).toContain('og-en.png');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run build && bun run test:site`
Expected: FAIL — placeholder page has no canonical/hreflang/theme script.

- [ ] **Step 3: Write `src/styles/tokens.css`**

```css
/*
 * Design tokens. light-dark() picks per color-scheme; the data-theme
 * attribute (set by the theme toggle) forces a scheme, overriding system.
 * Accent values are AA-checked per mode (≥4.5:1 on --color-bg).
 */
:root {
  color-scheme: light dark;

  --color-bg: light-dark(#faf9f6, #171411);
  --color-surface: light-dark(#f2efe9, #211d18);
  --color-text: light-dark(#1c1917, #e8e3dc);
  --color-muted: light-dark(#5f5a53, #a8a199);
  --color-accent: light-dark(#a34e06, #e5963f);
  --color-border: light-dark(#e7e1d7, #35302a);

  --font-serif: 'Fraunces Variable', Georgia, 'Times New Roman', serif;
  --font-sans: system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;

  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.75rem;
  --text-2xl: clamp(2.25rem, 5vw, 3rem);

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 1rem;
  --space-4: 1.5rem;
  --space-5: 2.5rem;
  --space-6: 4rem;
}

:root[data-theme='light'] {
  color-scheme: light;
}

:root[data-theme='dark'] {
  color-scheme: dark;
}
```

- [ ] **Step 4: Write `src/styles/global.css`**

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}

h1,
h2,
h3 {
  font-family: var(--font-serif);
  line-height: 1.15;
  margin: 0;

  & a {
    color: inherit;
  }
}

p {
  margin: 0 0 var(--space-3);
}

a {
  color: var(--color-accent);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;

  &:hover {
    text-decoration-thickness: 2px;
  }
}

:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
  border-radius: 2px;
}

.skip-link {
  position: absolute;
  left: -999px;
  top: var(--space-2);
  background: var(--color-accent);
  color: var(--color-bg);
  padding: var(--space-2) var(--space-3);
  border-radius: 4px;
  z-index: 10;

  &:focus {
    left: var(--space-2);
  }
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Write `public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#a34e06"/>
  <text x="16" y="22" font-family="Georgia, serif" font-size="15" font-weight="bold" fill="#faf9f6" text-anchor="middle">JW</text>
</svg>
```

- [ ] **Step 6: Write `src/layouts/Base.astro`**

```astro
---
import '@fontsource-variable/fraunces';
import '../styles/tokens.css';
import '../styles/global.css';
import { useTranslations, altLocale, localePath, type Locale } from '../i18n';

interface Props {
  locale: Locale;
  title: string;
  description: string;
}

const { locale, title, description } = Astro.props;
const t = useTranslations(locale);
const site = Astro.site!;
const canonical = new URL(localePath(locale), site);
const alternate = new URL(localePath(altLocale(locale)), site);
---

<!doctype html>
<html lang={locale}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <link rel="alternate" hreflang={locale} href={canonical} />
    <link rel="alternate" hreflang={altLocale(locale)} href={alternate} />
    <link rel="alternate" hreflang="x-default" href={new URL('/', site)} />
    <meta property="og:type" content="website" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={new URL(`/og-${locale}.png`, site)} />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="sitemap" href="/sitemap-index.xml" />
    <script is:inline>
      const stored = localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark') {
        document.documentElement.dataset.theme = stored;
      }
    </script>
    <slot name="head" />
  </head>
  <body>
    <a class="skip-link" href="#main">{t('nav.skip')}</a>
    <slot />
  </body>
</html>
```

- [ ] **Step 7: Update `src/pages/index.astro` to use Base**

```astro
---
import Base from '../layouts/Base.astro';
import { useTranslations } from '../i18n';

const t = useTranslations('en');
---

<Base locale="en" title="Jeroen Wever — Freelance staff engineer" description={t('meta.description')}>
  <main id="main"><h1>Jeroen Wever</h1></main>
</Base>
```

- [ ] **Step 8: Build and run tests to verify they pass**

Run: `bun run build && bun run test:site`
Expected: all `head.test.ts` tests pass.

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 9: Commit**

```bash
git add src/styles src/layouts public/favicon.svg src/pages/index.astro tests/site/head.test.ts
git commit -m "feat: add design tokens, global styles and Base layout with SEO head"
```

---

### Task 5: Resume page components & both locale pages

**Files:**
- Create: `src/components/ResumePage.astro`
- Create: `src/components/Sidebar.astro`
- Create: `src/components/LocaleToggle.astro`
- Create: `src/components/Section.astro`
- Create: `src/components/ExperienceItem.astro`
- Create: `src/components/SkillsList.astro`
- Create: `src/components/MobileActions.astro`
- Modify: `src/pages/index.astro`
- Create: `src/pages/nl/index.astro`
- Test: `tests/site/pages.test.ts`

**Interfaces:**
- Consumes: `Base.astro` (Task 4), `getResume` + `Resume` (Task 2), i18n helpers (Task 3).
- Produces: `ResumePage.astro` with props `{ locale: Locale }` rendering the complete page. CV download links point at `/cv-en.pdf` / `/cv-nl.pdf` (files produced in Task 7). Note: in this task the Sidebar `.meta` div holds only the LocaleToggle; Task 6 adds the ThemeToggle import next to it.

- [ ] **Step 1: Write the failing test `tests/site/pages.test.ts`**

```ts
import { describe, test, expect } from 'bun:test';
import { existsSync } from 'node:fs';

const dist = new URL('../../dist/', import.meta.url).pathname;
if (!existsSync(dist)) throw new Error('dist/ missing — run `bun run build` before test:site');

const en = await Bun.file(dist + 'index.html').text();
const nl = await Bun.file(dist + 'nl/index.html').text();

describe('resume pages', () => {
  test('NL page exists with lang="nl"', () => {
    expect(nl).toContain('<html lang="nl"');
  });

  test('both locales render name and section headings', () => {
    expect(en).toContain('Jeroen Wever');
    expect(en).toContain('Experience');
    expect(en).toContain('Skills');
    expect(nl).toContain('Jeroen Wever');
    expect(nl).toContain('Werkervaring');
    expect(nl).toContain('Vaardigheden');
  });

  test('all three CTAs present in both locales', () => {
    for (const [html, locale] of [
      [en, 'en'],
      [nl, 'nl'],
    ] as const) {
      expect(html).toContain('mailto:jeroen@jeroenwever.com');
      expect(html).toContain('linkedin.com');
      expect(html).toContain(`/cv-${locale}.pdf`);
    }
  });

  test('language toggle links to the other locale', () => {
    expect(en).toContain('href="/nl/"');
    expect(nl).toContain('href="/"');
  });

  test('JSON-LD Person structured data', () => {
    expect(en).toContain('application/ld+json');
    expect(en).toContain('"@type":"Person"');
  });

  test('semantic landmarks and single h1', () => {
    expect(en).toContain('<main id="main"');
    expect((en.match(/<h1/g) ?? []).length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run build && bun run test:site`
Expected: FAIL — no NL page, no CTAs.

- [ ] **Step 3: Write `src/components/Section.astro`**

```astro
---
interface Props {
  id: string;
  title: string;
}

const { id, title } = Astro.props;
---

<section id={id} aria-labelledby={`${id}-heading`}>
  <h2 id={`${id}-heading`}>{title}</h2>
  <slot />
</section>

<style>
  section {
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-4);
    margin-bottom: var(--space-5);
  }

  h2 {
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-accent);
    margin-bottom: var(--space-4);
  }
</style>
```

- [ ] **Step 4: Write `src/components/ExperienceItem.astro`**

```astro
---
import { useTranslations, type Locale } from '../i18n';
import type { Resume } from '../content/schema';

interface Props {
  job: Resume['experience'][number];
  locale: Locale;
}

const { job, locale } = Astro.props;
const t = useTranslations(locale);

function fmt(ym: string): string {
  const [y, m] = ym.split('-');
  if (!m) return y!;
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(
    new Date(Number(y), Number(m) - 1)
  );
}

const period = `${fmt(job.start)} — ${job.end ? fmt(job.end) : t('experience.present')}`;
---

<article>
  <header>
    <h3>{job.role} · {job.company}</h3>
    <p class="period">{period}</p>
  </header>
  <p>{job.summary}</p>
  <ul>
    {job.highlights.map((h) => <li>{h}</li>)}
  </ul>
  {job.stack.length > 0 && <p class="stack">{job.stack.join(' · ')}</p>}
</article>

<style>
  article {
    margin-bottom: var(--space-5);

    &:last-of-type {
      margin-bottom: 0;
    }
  }

  h3 {
    font-size: var(--text-lg);
  }

  .period {
    font-size: var(--text-sm);
    color: var(--color-muted);
    margin: var(--space-1) 0 var(--space-3);
  }

  ul {
    margin: 0 0 var(--space-3);
    padding-left: 1.2em;

    & li {
      margin-bottom: var(--space-1);

      &::marker {
        color: var(--color-accent);
      }
    }
  }

  .stack {
    font-size: var(--text-sm);
    color: var(--color-muted);
  }
</style>
```

- [ ] **Step 5: Write `src/components/SkillsList.astro`**

```astro
---
import type { Resume } from '../content/schema';

interface Props {
  groups: Resume['skills'];
}

const { groups } = Astro.props;
---

<dl>
  {
    groups.map((g) => (
      <div>
        <dt>{g.group}</dt>
        <dd>{g.items.join(' · ')}</dd>
      </div>
    ))
  }
</dl>

<style>
  dl {
    margin: 0;
    display: grid;
    gap: var(--space-3);
  }

  dt {
    font-weight: 600;
    font-size: var(--text-sm);
  }

  dd {
    margin: var(--space-1) 0 0;
    color: var(--color-muted);
  }
</style>
```

- [ ] **Step 6: Write `src/components/LocaleToggle.astro`**

```astro
---
import { useTranslations, altLocale, localePath, type Locale } from '../i18n';

interface Props {
  locale: Locale;
}

const { locale } = Astro.props;
const t = useTranslations(locale);
const other = altLocale(locale);
---

<a href={localePath(other)} hreflang={other} lang={other}>{t('locale.switch')}</a>

<style>
  a {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    font-size: var(--text-sm);
  }
</style>
```

- [ ] **Step 7: Write `src/components/Sidebar.astro`**

```astro
---
import LocaleToggle from './LocaleToggle.astro';
import { useTranslations, type Locale } from '../i18n';
import type { Resume } from '../content/schema';

interface Props {
  locale: Locale;
  basics: Resume['basics'];
}

const { locale, basics } = Astro.props;
const t = useTranslations(locale);
---

<header class="sidebar">
  <div>
    <p class="kicker">{basics.location}</p>
    <h1>{basics.name}</h1>
    <p class="title">{basics.title}</p>
    <p class="tagline">{basics.tagline}</p>
  </div>

  <nav aria-label={t('sidebar.contactNav')}>
    <ul>
      <li><a href={`mailto:${basics.email}`}>{t('sidebar.email')}</a></li>
      <li><a href={basics.linkedin}>{t('sidebar.linkedin')}</a></li>
      <li><a href={`/cv-${locale}.pdf`} download>{t('sidebar.downloadCv')}</a></li>
    </ul>
  </nav>

  <div class="meta">
    <LocaleToggle locale={locale} />
  </div>
</header>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);

    @media (min-width: 56rem) {
      position: sticky;
      top: var(--space-6);
      align-self: start;
    }
  }

  .kicker {
    font-size: var(--text-sm);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-muted);
    margin-bottom: var(--space-2);
  }

  h1 {
    font-size: var(--text-2xl);
    font-weight: 650;
  }

  .title {
    color: var(--color-accent);
    margin: var(--space-2) 0 0;
    font-weight: 500;
  }

  .tagline {
    font-family: var(--font-serif);
    font-style: italic;
    font-size: var(--text-lg);
    color: var(--color-muted);
    margin: var(--space-3) 0 0;
  }

  nav ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);

    & a {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
    }
  }

  .meta {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }
</style>
```

- [ ] **Step 8: Write `src/components/MobileActions.astro`**

```astro
---
import { useTranslations, type Locale } from '../i18n';
import type { Resume } from '../content/schema';

interface Props {
  locale: Locale;
  basics: Resume['basics'];
}

const { locale, basics } = Astro.props;
const t = useTranslations(locale);
---

<nav class="mobile-actions" aria-label={t('mobile.contactNav')}>
  <a href={`mailto:${basics.email}`}>{t('sidebar.email')}</a>
  <a href={basics.linkedin}>{t('sidebar.linkedin')}</a>
  <a href={`/cv-${locale}.pdf`} download>CV</a>
</nav>

<style>
  .mobile-actions {
    display: none;

    @media (max-width: 55.99rem) {
      display: flex;
      position: fixed;
      bottom: 0;
      inset-inline: 0;
      background: var(--color-surface);
      border-top: 1px solid var(--color-border);
      justify-content: space-around;
      padding: var(--space-2);
    }

    & a {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 0 var(--space-3);
      font-size: var(--text-sm);
    }
  }
</style>
```

- [ ] **Step 9: Write `src/components/ResumePage.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import Sidebar from './Sidebar.astro';
import Section from './Section.astro';
import ExperienceItem from './ExperienceItem.astro';
import SkillsList from './SkillsList.astro';
import MobileActions from './MobileActions.astro';
import { getResume } from '../content';
import { useTranslations, type Locale } from '../i18n';

interface Props {
  locale: Locale;
}

const { locale } = Astro.props;
const resume = getResume(locale);
const t = useTranslations(locale);
const { basics } = resume;

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: basics.name,
  jobTitle: basics.title,
  email: `mailto:${basics.email}`,
  url: Astro.site?.href,
  sameAs: [basics.linkedin],
};
---

<Base locale={locale} title={`${basics.name} — ${basics.title}`} description={t('meta.description')}>
  <script slot="head" type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
  <div class="page">
    <Sidebar locale={locale} basics={basics} />
    <main id="main">
      <Section id="about" title={t('section.about')}>
        <p class="summary">{basics.summary}</p>
      </Section>

      <Section id="experience" title={t('section.experience')}>
        {resume.experience.map((job) => <ExperienceItem job={job} locale={locale} />)}
      </Section>

      <Section id="skills" title={t('section.skills')}>
        <SkillsList groups={resume.skills} />
      </Section>

      {
        resume.education.length > 0 && (
          <Section id="education" title={t('section.education')}>
            <ul class="education">
              {resume.education.map((e) => (
                <li>
                  <strong>{e.degree}</strong>, {e.school} · {e.year}
                </li>
              ))}
            </ul>
          </Section>
        )
      }

      <p class="outro">
        {t('outro.line')} <a href={`mailto:${basics.email}`}>{basics.email}</a>
      </p>
    </main>
  </div>
  <MobileActions locale={locale} basics={basics} />
</Base>

<style>
  .page {
    max-width: 72rem;
    margin-inline: auto;
    padding: var(--space-6) var(--space-4);
    display: grid;
    gap: var(--space-6);

    @media (min-width: 56rem) {
      grid-template-columns: minmax(16rem, 20rem) 1fr;
    }

    @media (max-width: 55.99rem) {
      padding-bottom: calc(var(--space-6) + 3rem); /* room for mobile actions bar */
    }
  }

  .summary {
    font-size: var(--text-lg);
    line-height: 1.6;
    margin: 0;
  }

  .education {
    list-style: none;
    margin: 0;
    padding: 0;

    & li {
      margin-bottom: var(--space-2);
    }
  }

  .outro {
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-4);
    color: var(--color-muted);
    margin: 0;
  }
</style>
```

- [ ] **Step 10: Replace `src/pages/index.astro` and create `src/pages/nl/index.astro`**

`src/pages/index.astro`:

```astro
---
import ResumePage from '../components/ResumePage.astro';
---

<ResumePage locale="en" />
```

`src/pages/nl/index.astro`:

```astro
---
import ResumePage from '../../components/ResumePage.astro';
---

<ResumePage locale="nl" />
```

- [ ] **Step 11: Build and run tests to verify they pass**

Run: `bun run build && bun run test:site`
Expected: `pages.test.ts` and `head.test.ts` all pass.

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 12: Visual sanity check**

Run: `bun run dev`
Open http://localhost:4321 and http://localhost:4321/nl/ — verify: sticky sidebar on desktop, single column + bottom action bar on a narrow window, dark mode follows OS setting. Stop the dev server.

- [ ] **Step 13: Commit**

```bash
git add src/components src/pages tests/site/pages.test.ts
git commit -m "feat: add resume page components and EN/NL pages"
```

---

### Task 6: Theme toggle

**Files:**
- Create: `src/components/ThemeToggle.astro`
- Modify: `src/components/Sidebar.astro` (add ThemeToggle to `.meta`)
- Create: `scripts/serve-dist.ts`
- Test: `tests/site/theme.test.ts`

**Interfaces:**
- Consumes: i18n helpers (Task 3); tokens `data-theme` behavior (Task 4); Sidebar `.meta` container (Task 5).
- Produces: `ThemeToggle.astro` with props `{ locale: Locale }`; `serveDist()` from `scripts/serve-dist.ts` returning `{ server: ReturnType<typeof Bun.serve>, origin: string, dist: string }` — reused by Task 7 (PDF) and Task 8 (axe).

- [ ] **Step 1: Install Playwright's Chromium**

Run: `bunx playwright install chromium`
Expected: Chromium downloads (skips if already present).

- [ ] **Step 2: Write `scripts/serve-dist.ts`**

```ts
import { existsSync } from 'node:fs';

/** Serve the built dist/ directory on a random port. Caller must stop() the server. */
export function serveDist() {
  const dist = new URL('../dist/', import.meta.url).pathname;
  if (!existsSync(dist)) throw new Error('dist/ missing — run `bun run build` first');

  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      let path = decodeURIComponent(new URL(req.url).pathname);
      if (path.endsWith('/')) path += 'index.html';
      let file = Bun.file(dist + path);
      if (!(await file.exists())) file = Bun.file(dist + path + '/index.html');
      if (!(await file.exists())) return new Response('not found', { status: 404 });
      return new Response(file);
    },
  });

  return { server, origin: `http://localhost:${server.port}`, dist };
}
```

- [ ] **Step 3: Write the failing test `tests/site/theme.test.ts`**

```ts
import { test, expect, afterAll } from 'bun:test';
import { chromium } from 'playwright';
import { serveDist } from '../../scripts/serve-dist';

const { server, origin } = serveDist();
const browser = await chromium.launch();

afterAll(async () => {
  await browser.close();
  server.stop();
});

test('toggle cycles system → light → dark and persists override', async () => {
  const page = await browser.newPage();
  await page.goto(origin + '/');

  const toggle = page.locator('#theme-toggle');
  expect(await toggle.count()).toBe(1);

  // default: system — no data-theme attribute, nothing stored
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBeUndefined();

  // first click → light override
  await toggle.click();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');

  // second click → dark override
  await toggle.click();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');

  // reload → override re-applied before interaction
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');

  // third click → back to system, override cleared
  await page.locator('#theme-toggle').click();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBeUndefined();
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();

  await page.close();
});

test('toggle has an accessible name reflecting current state', async () => {
  const page = await browser.newPage();
  await page.goto(origin + '/');
  const label = await page.locator('#theme-toggle').getAttribute('aria-label');
  expect(label).toContain('Theme');
  expect(label).toContain('System');
  await page.close();
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `bun run build && bun test tests/site/theme.test.ts`
Expected: FAIL — `#theme-toggle` count is 0.

- [ ] **Step 5: Write `src/components/ThemeToggle.astro`**

```astro
---
import { useTranslations, type Locale } from '../i18n';

interface Props {
  locale: Locale;
}

const { locale } = Astro.props;
const t = useTranslations(locale);
---

<button
  id="theme-toggle"
  type="button"
  data-label-legend={t('theme.legend')}
  data-label-system={t('theme.system')}
  data-label-light={t('theme.light')}
  data-label-dark={t('theme.dark')}
>
  <span aria-hidden="true">◐</span>
  <span class="label"></span>
</button>

<script>
  type Mode = 'system' | 'light' | 'dark';
  const order: Mode[] = ['system', 'light', 'dark'];
  const btn = document.getElementById('theme-toggle') as HTMLButtonElement;
  const labelEl = btn.querySelector('.label') as HTMLSpanElement;

  const stored = localStorage.getItem('theme');
  let mode: Mode = stored === 'light' || stored === 'dark' ? stored : 'system';

  function labelFor(m: Mode): string {
    return btn.dataset[`label${m[0]!.toUpperCase()}${m.slice(1)}` as 'labelSystem'] ?? m;
  }

  function apply(next: Mode): void {
    mode = next;
    if (next === 'system') {
      delete document.documentElement.dataset.theme;
      localStorage.removeItem('theme');
    } else {
      document.documentElement.dataset.theme = next;
      localStorage.setItem('theme', next);
    }
    labelEl.textContent = labelFor(next);
    btn.setAttribute('aria-label', `${btn.dataset.labelLegend}: ${labelFor(next)}`);
  }

  apply(mode);
  btn.addEventListener('click', () => {
    apply(order[(order.indexOf(mode) + 1) % order.length]!);
  });
</script>

<style>
  button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    min-height: 24px;
    padding: var(--space-1) var(--space-2);
    font: inherit;
    font-size: var(--text-sm);
    color: var(--color-text);
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    cursor: pointer;

    &:hover {
      border-color: var(--color-accent);
    }
  }
</style>
```

- [ ] **Step 6: Add the toggle to `src/components/Sidebar.astro`**

In the frontmatter, after the `LocaleToggle` import, add:

```astro
import ThemeToggle from './ThemeToggle.astro';
```

Replace the `.meta` div with:

```astro
  <div class="meta">
    <LocaleToggle locale={locale} />
    <ThemeToggle locale={locale} />
  </div>
```

- [ ] **Step 7: Build and run tests to verify they pass**

Run: `bun run build && bun run test:site`
Expected: all pass, including both theme tests.

- [ ] **Step 8: Commit**

```bash
git add src/components/ThemeToggle.astro src/components/Sidebar.astro scripts/serve-dist.ts tests/site/theme.test.ts
git commit -m "feat: add persisted theme toggle (system/light/dark)"
```

---

### Task 7: CV print route, OG image route & PDF generation

**Files:**
- Create: `src/pages/cv/[locale].astro`
- Create: `src/pages/og/[locale].astro`
- Create: `scripts/generate-assets.ts`
- Modify: `package.json` (`build` script)
- Test: `tests/site/assets.test.ts`

**Interfaces:**
- Consumes: `getResume` (Task 2), i18n (Task 3), `serveDist()` (Task 6).
- Produces: `dist/cv-en.pdf`, `dist/cv-nl.pdf`, `dist/og-en.png`, `dist/og-nl.png` after `bun run build`. These are the files the CV links (Task 5) and og:image tags (Task 4) already point at.

- [ ] **Step 1: Write the failing test `tests/site/assets.test.ts`**

```ts
import { describe, test, expect } from 'bun:test';
import { existsSync } from 'node:fs';

const dist = new URL('../../dist/', import.meta.url).pathname;
if (!existsSync(dist)) throw new Error('dist/ missing — run `bun run build` before test:site');

describe('generated assets', () => {
  for (const locale of ['en', 'nl'] as const) {
    test(`cv-${locale}.pdf exists, is a PDF, and is non-trivial`, async () => {
      const file = Bun.file(`${dist}cv-${locale}.pdf`);
      expect(await file.exists()).toBe(true);
      expect(file.size).toBeGreaterThan(10_000);
      const head = new Uint8Array((await file.arrayBuffer()).slice(0, 5));
      expect(new TextDecoder().decode(head)).toBe('%PDF-');
    });

    test(`og-${locale}.png exists and is non-trivial`, async () => {
      const file = Bun.file(`${dist}og-${locale}.png`);
      expect(await file.exists()).toBe(true);
      expect(file.size).toBeGreaterThan(5_000);
    });
  }

  test('cv and og source routes are noindex', async () => {
    const cv = await Bun.file(`${dist}cv/en/index.html`).text();
    expect(cv).toContain('noindex');
  });

  test('sitemap excludes cv and og routes', async () => {
    const sitemapIndex = await Bun.file(`${dist}sitemap-index.xml`).text();
    const match = sitemapIndex.match(/<loc>([^<]+)<\/loc>/);
    const sitemapFile = match![1]!.replace('https://jeroenwever.com/', '');
    const sitemap = await Bun.file(dist + sitemapFile).text();
    expect(sitemap).not.toContain('/cv/');
    expect(sitemap).not.toContain('/og/');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run build && bun test tests/site/assets.test.ts`
Expected: FAIL — no PDFs/PNGs in dist.

- [ ] **Step 3: Write `src/pages/cv/[locale].astro`**

Standalone print document — deliberately does not use Base (no chrome, forced light, print-tuned). Literal colors are the light-theme token values.

```astro
---
import { getResume } from '../../content';
import { useTranslations, locales, type Locale } from '../../i18n';

export function getStaticPaths() {
  return locales.map((locale) => ({ params: { locale } }));
}

const locale = Astro.params.locale as Locale;
const resume = getResume(locale);
const t = useTranslations(locale);
const { basics } = resume;

function fmt(ym: string): string {
  const [y, m] = ym.split('-');
  if (!m) return y!;
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(
    new Date(Number(y), Number(m) - 1)
  );
}
---

<!doctype html>
<html lang={locale}>
  <head>
    <meta charset="utf-8" />
    <title>{basics.name} — CV ({locale.toUpperCase()})</title>
    <meta name="robots" content="noindex" />
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 14mm 16mm;
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 10.5pt;
        line-height: 1.5;
        color: #1c1917;
        background: #fff;
      }
      h1 {
        font-size: 22pt;
        margin: 0;
      }
      .head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        border-bottom: 2px solid #a34e06;
        padding-bottom: 4mm;
        margin-bottom: 6mm;
      }
      .contact {
        text-align: right;
        font-size: 9pt;
        color: #5f5a53;
      }
      .title {
        color: #a34e06;
        font-weight: 600;
        margin: 1mm 0 0;
      }
      h2 {
        font-family: Helvetica, Arial, sans-serif;
        font-size: 8.5pt;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #a34e06;
        margin: 6mm 0 2mm;
      }
      article {
        margin-bottom: 4mm;
        break-inside: avoid;
      }
      h3 {
        font-size: 11.5pt;
        margin: 0;
      }
      .period {
        font-size: 9pt;
        color: #5f5a53;
        margin: 0 0 1mm;
      }
      p {
        margin: 0 0 1.5mm;
      }
      ul {
        margin: 0 0 1.5mm;
        padding-left: 5mm;
      }
      .stack,
      dd {
        font-size: 9pt;
        color: #5f5a53;
      }
      dl {
        margin: 0;
      }
      dt {
        font-weight: 700;
        font-size: 9.5pt;
        margin-top: 1.5mm;
      }
      dd {
        margin: 0;
      }
    </style>
  </head>
  <body>
    <header class="head">
      <div>
        <h1>{basics.name}</h1>
        <p class="title">{basics.title}</p>
      </div>
      <div class="contact">
        {basics.location}<br />
        {basics.email}<br />
        {basics.linkedin.replace('https://www.', '')}
      </div>
    </header>

    <p>{basics.summary}</p>

    <h2>{t('section.experience')}</h2>
    {
      resume.experience.map((job) => (
        <article>
          <h3>
            {job.role} · {job.company}
          </h3>
          <p class="period">
            {fmt(job.start)} — {job.end ? fmt(job.end) : t('experience.present')}
          </p>
          <p>{job.summary}</p>
          <ul>
            {job.highlights.map((h) => (
              <li>{h}</li>
            ))}
          </ul>
          {job.stack.length > 0 && <p class="stack">{job.stack.join(' · ')}</p>}
        </article>
      ))
    }

    <h2>{t('section.skills')}</h2>
    <dl>
      {
        resume.skills.map((g) => (
          <div>
            <dt>{g.group}</dt>
            <dd>{g.items.join(' · ')}</dd>
          </div>
        ))
      }
    </dl>

    {
      resume.education.length > 0 && (
        <>
          <h2>{t('section.education')}</h2>
          {resume.education.map((e) => (
            <p>
              <strong>{e.degree}</strong>, {e.school} · {e.year}
            </p>
          ))}
        </>
      )
    }
  </body>
</html>
```

- [ ] **Step 4: Write `src/pages/og/[locale].astro`**

1200×630 social card source. Literal colors are the light-theme token values.

```astro
---
import { getResume } from '../../content';
import { locales, type Locale } from '../../i18n';

export function getStaticPaths() {
  return locales.map((locale) => ({ params: { locale } }));
}

const locale = Astro.params.locale as Locale;
const { basics } = getResume(locale);
---

<!doctype html>
<html lang={locale}>
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex" />
    <title>og-image source</title>
    <style>
      * {
        margin: 0;
        box-sizing: border-box;
      }
      body {
        width: 1200px;
        height: 630px;
        background: #faf9f6;
        color: #1c1917;
        font-family: Georgia, 'Times New Roman', serif;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 80px;
        border-bottom: 24px solid #a34e06;
      }
      h1 {
        font-size: 96px;
        font-weight: 700;
        line-height: 1.05;
      }
      .title {
        font-family: Helvetica, Arial, sans-serif;
        font-size: 36px;
        color: #a34e06;
        margin-top: 24px;
      }
      .tagline {
        font-style: italic;
        font-size: 32px;
        color: #5f5a53;
        margin-top: 16px;
      }
    </style>
  </head>
  <body>
    <h1>{basics.name}</h1>
    <p class="title">{basics.title}</p>
    <p class="tagline">{basics.tagline}</p>
  </body>
</html>
```

- [ ] **Step 5: Write `scripts/generate-assets.ts`**

```ts
import { chromium } from 'playwright';
import { locales } from '../src/i18n';
import { serveDist } from './serve-dist';

const { server, origin, dist } = serveDist();
const browser = await chromium.launch();

try {
  for (const locale of locales) {
    const page = await browser.newPage();

    await page.goto(`${origin}/cv/${locale}/`, { waitUntil: 'networkidle' });
    await page.pdf({ path: `${dist}cv-${locale}.pdf`, format: 'A4', printBackground: true });

    await page.setViewportSize({ width: 1200, height: 630 });
    await page.goto(`${origin}/og/${locale}/`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${dist}og-${locale}.png` });

    await page.close();
    console.log(`✓ cv-${locale}.pdf + og-${locale}.png`);
  }
} finally {
  await browser.close();
  server.stop();
}

// Fail the build loudly if anything is missing or suspiciously small.
for (const locale of locales) {
  const pdf = Bun.file(`${dist}cv-${locale}.pdf`);
  if (!(await pdf.exists()) || pdf.size < 10_000) {
    console.error(`cv-${locale}.pdf missing or too small (${pdf.size} bytes)`);
    process.exit(1);
  }
}
```

- [ ] **Step 6: Wire into the build in `package.json`**

Change the `build` script to:

```json
"build": "astro build && bun run scripts/generate-assets.ts"
```

- [ ] **Step 7: Build and run tests to verify they pass**

Run: `bun run build`
Expected: Astro build output followed by `✓ cv-en.pdf + og-en.png` and `✓ cv-nl.pdf + og-nl.png`.

Run: `bun run test:site`
Expected: all pass, including `assets.test.ts`.

Open `dist/cv-en.pdf` and eyeball it: single A4 flow, readable, selectable text.

- [ ] **Step 8: Commit**

```bash
git add src/pages/cv src/pages/og scripts/generate-assets.ts package.json tests/site/assets.test.ts
git commit -m "feat: generate PDF CVs and OG images from site content at build time"
```

---

### Task 8: Accessibility scan & link checks

**Files:**
- Test: `tests/site/a11y.test.ts`
- Possibly modify: any component that axe flags (fix violations inline).

**Interfaces:**
- Consumes: `serveDist()` (Task 6), built site (Tasks 4–7).
- Produces: CI-enforceable WCAG 2.2 AA guarantee — the spec's hard requirement.

- [ ] **Step 1: Write `tests/site/a11y.test.ts`**

```ts
import { test, expect, afterAll } from 'bun:test';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { serveDist } from '../../scripts/serve-dist';

const { server, origin } = serveDist();
const browser = await chromium.launch();

afterAll(async () => {
  await browser.close();
  server.stop();
});

for (const path of ['/', '/nl/'] as const) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`${path} (${colorScheme}) has zero WCAG 2.2 AA violations`, async () => {
      const context = await browser.newContext({ colorScheme });
      const page = await context.newPage();
      await page.goto(origin + path);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();

      const summary = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.html),
      }));
      expect(summary).toEqual([]);

      await context.close();
    });
  }
}

test('CTA links resolve to real targets', async () => {
  const page = await browser.newPage();
  await page.goto(origin + '/');

  const hrefs = await page.$$eval('a[href]', (els) => els.map((a) => a.getAttribute('href')!));
  expect(hrefs.some((h) => h.startsWith('mailto:jeroen@'))).toBe(true);
  expect(hrefs.some((h) => h.includes('linkedin.com'))).toBe(true);

  // internal targets must exist on the server
  for (const href of hrefs.filter((h) => h.startsWith('/'))) {
    const res = await fetch(origin + href);
    expect(res.status, `broken link: ${href}`).toBe(200);
  }
  await page.close();
});
```

- [ ] **Step 2: Run the scan**

Run: `bun run build && bun test tests/site/a11y.test.ts`
Expected: likely some violations on first run (typically color-contrast or landmark issues).

- [ ] **Step 3: Fix any violations**

For each violation axe reports, fix the component at fault — adjust token values in `src/styles/tokens.css` for contrast issues (keep changes in tokens, not components), add missing ARIA/semantics in the component for structural issues. Re-run `bun run build && bun test tests/site/a11y.test.ts` after each fix until zero violations in all four combinations.

- [ ] **Step 4: Run the full suite**

Run: `bun run check && bun run test:unit && bun run build && bun run test:site`
Expected: everything green.

- [ ] **Step 5: Commit**

```bash
git add tests/site/a11y.test.ts src/
git commit -m "test: enforce WCAG 2.2 AA with axe scans in both locales and color schemes"
```

---

### Task 9: CI & Cloudflare Pages deployment

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `README.md`

**Interfaces:**
- Consumes: all scripts from `package.json` (Tasks 1–8).
- Produces: CI that gates deploys on the full test suite; deploys `dist/` to Cloudflare Pages project `jeroenwever-com` (production on `main`, preview per branch).

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:

jobs:
  build-test-deploy:
    runs-on: ubuntu-latest
    env:
      HAS_CF_SECRETS: ${{ secrets.CLOUDFLARE_API_TOKEN != '' }}
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Install Playwright Chromium
        run: bunx playwright install --with-deps chromium

      - name: Typecheck
        run: bun run check

      - name: Unit tests
        run: bun run test:unit

      - name: Build (site + PDFs + OG images)
        run: bun run build

      - name: Site tests (smoke, assets, theme, axe)
        run: bun run test:site

      - name: Deploy to Cloudflare Pages
        if: env.HAS_CF_SECRETS == 'true'
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=jeroenwever-com --branch=${{ github.ref_name }}
```

- [ ] **Step 2: Write `README.md`**

````markdown
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
````

- [ ] **Step 3: Verify locally that the CI sequence is green**

Run the exact commands CI runs, in order:

Run: `bun install --frozen-lockfile && bun run check && bun run test:unit && bun run build && bun run test:site`
Expected: everything green — CI mirrors this exactly.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml README.md
git commit -m "ci: build, test and deploy to Cloudflare Pages"
```

- [ ] **Step 5: Manual follow-up for Jeroen (document, don't block)**

The GitHub repo, Cloudflare project, secrets, and custom domain are account-level actions only Jeroen can do (README step-by-step covers them). Deploy step is skipped automatically until secrets exist.

---

### Task 10: Real content & launch checklist

**Files:**
- Modify: `src/content/resume.en.json`
- Modify: `src/content/resume.nl.json`
- Possibly modify: `src/i18n/en.ts` / `src/i18n/nl.ts` (meta descriptions to match final copy)

**Interfaces:**
- Consumes: everything.
- Produces: launch-ready site. **This task blocks on input from Jeroen** (his actual CV / LinkedIn export).

- [ ] **Step 1: Collect content**

Ask Jeroen for his CV or LinkedIn profile export, his actual LinkedIn URL, preferred location string, and the final Dutch tagline (current NL placeholder: "Ik bouw producten die live gaan." — confirm or improve with him).

- [ ] **Step 2: Replace placeholder content**

Rewrite `resume.en.json` and `resume.nl.json` with real roles, companies, periods, highlights and stacks. Remove every `(PLACEHOLDER)` marker. Keep highlights outcome-focused (what shipped, what improved, numbers where possible) — this is a staff-engineer pitch, not a task list.

- [ ] **Step 3: Verify**

Run: `grep -ri placeholder src/content/`
Expected: no matches.

Run: `bun run check && bun run test:unit && bun run build && bun run test:site`
Expected: everything green.

- [ ] **Step 4: Manual launch pass (with Jeroen)**

- Keyboard-only walkthrough: tab through both locales — skip link, all CTAs, both toggles reachable and operable.
- VoiceOver spot check (Safari, `Cmd+F5`): landmarks announced, headings navigable, toggle states announced.
- Mobile viewport check (responsive mode): compact header, bottom action bar, 24px+ targets.
- Dark mode + override: system dark, then toggle through all three states, reload — override persists.
- Open `cv-en.pdf` and `cv-nl.pdf`: correct content, selectable text, sensible page breaks.
- Lighthouse run on the deployed URL: expect ~100 across the board; investigate anything below 95.

- [ ] **Step 5: Commit**

```bash
git add src/content src/i18n
git commit -m "content: replace placeholders with real resume content"
```

- [ ] **Step 6: Push and confirm deploy**

```bash
git push origin main
```

Watch the GitHub Actions run; confirm production deploy and that https://jeroenwever.com serves both locales with working PDFs.
