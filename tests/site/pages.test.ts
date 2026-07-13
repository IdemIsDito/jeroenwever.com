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
      expect(html).toContain('mailto:jeroen@jeroenwever.com');
      expect(html).toContain('linkedin.com');
      expect(html).toContain(`/${pdfName[locale]}`);
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
