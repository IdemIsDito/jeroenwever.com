import { describe, test, expect } from 'bun:test';
import { existsSync } from 'node:fs';

const dist = new URL('../../dist/', import.meta.url).pathname;
if (!existsSync(dist)) throw new Error('dist/ missing — run `bun run build` before test:site');

const pdfName = { en: 'resume_jeroenwever.pdf', nl: 'cv_jeroenwever.pdf' } as const;

describe('generated assets', () => {
  for (const locale of ['en', 'nl'] as const) {
    test(`${pdfName[locale]} exists, is a PDF, and is non-trivial`, async () => {
      const file = Bun.file(`${dist}${pdfName[locale]}`);
      expect(await file.exists()).toBe(true);
      expect(file.size).toBeGreaterThan(10_000);
      const head = new Uint8Array((await file.arrayBuffer()).slice(0, 5));
      expect(new TextDecoder().decode(head)).toBe('%PDF-');
    });

    test(`${pdfName[locale]} is tagged with a structure tree (accessible/language metadata)`, async () => {
      const file = Bun.file(`${dist}${pdfName[locale]}`);
      const text = await file.text();
      expect(text).toContain('StructTreeRoot');
    });

    test(`og-${locale}.png exists and is non-trivial`, async () => {
      const file = Bun.file(`${dist}og-${locale}.png`);
      expect(await file.exists()).toBe(true);
      expect(file.size).toBeGreaterThan(5_000);
    });
  }

  for (const locale of ['en', 'nl'] as const) {
    for (const route of ['cv', 'og'] as const) {
      test(`${route}/${locale} source route is noindex`, async () => {
        const html = await Bun.file(`${dist}${route}/${locale}/index.html`).text();
        expect(html).toContain('noindex');
      });
    }
  }

  test('sitemap excludes cv and og routes', async () => {
    const sitemapIndex = await Bun.file(`${dist}sitemap-index.xml`).text();
    const match = sitemapIndex.match(/<loc>([^<]+)<\/loc>/);
    const sitemapFile = match![1]!.replace('https://jeroenwever.com/', '');
    const sitemap = await Bun.file(dist + sitemapFile).text();
    expect(sitemap).not.toContain('/cv/');
    expect(sitemap).not.toContain('/og/');
  });
});
