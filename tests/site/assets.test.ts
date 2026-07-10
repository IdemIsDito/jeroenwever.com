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
