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

  test('all CTAs present in both locales', () => {
    const pdfName = { en: 'resume_jeroenwever.pdf', nl: 'cv_jeroenwever.pdf' } as const;
    for (const [html, locale] of [
      [en, 'en'],
      [nl, 'nl'],
    ] as const) {
      expect(html).toContain('mailto:jeroen@sugarrush.dev');
      expect(html).toContain('linkedin.com');
      expect(html).toContain(`/${pdfName[locale]}`);
    }
  });

  test('the closing block names the operator and links to the company site', () => {
    expect(en).toContain('Jeroen Wever operates as');
    expect(nl).toContain('Jeroen Wever werkt als');
    // The company site carries the same locales, so the link stays in-language.
    expect(en).toContain('href="https://sugarrush.dev/"');
    expect(nl).toContain('href="https://sugarrush.dev/nl/"');
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

describe('inline links in content', () => {
  test('render as anchors with no markdown left over', () => {
    for (const html of [en, nl]) {
      for (const href of ['https://casino.toto.nl', 'https://sport.toto.nl', 'https://last-invention.sugarrush.dev']) {
        expect(html).toContain(`href="${href}"`);
      }
      expect(html).not.toContain('](https://');
    }
  });
});

describe('printable CV', () => {
  test('carries the hero lead without repeating the title', async () => {
    const cv = await Bun.file(dist + 'cv/nl/index.html').text();
    expect(cv).toContain('Tegenwoordig met AI-agents, en de lat leg ik.');
    expect(cv).not.toContain('front-end engineer. Ik bouw');
  });
});
