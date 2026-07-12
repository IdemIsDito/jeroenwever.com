import { describe, test, expect } from 'bun:test';
import { existsSync } from 'node:fs';

const dist = new URL('../../dist/', import.meta.url).pathname;
if (!existsSync(dist)) throw new Error('dist/ missing — run `bun run build` before test:site');

describe('llms.txt', () => {
  test('exists and describes Jeroen from resume data', async () => {
    const txt = await Bun.file(dist + 'llms.txt').text();
    expect(txt).toContain('# Jeroen Wever');
    expect(txt).toContain('Freelance staff engineer');
    expect(txt).toContain('/cv-en.pdf');
    expect(txt).toContain('Sugar Rush Development');
    expect(txt).toContain('jeroen@jeroenwever.com');
  });
});

describe('404 page', () => {
  test('404.html exists in build output (Cloudflare Pages serves it with 404 status)', async () => {
    const html = await Bun.file(dist + '404.html').text();
    expect(html).toContain('<html lang="en"');
    expect(html).toContain('melted');
    expect(html).toContain('noindex');
    expect(html).toContain('href="/nl/"');
  });

  test('404 is not in the sitemap', async () => {
    const sitemapIndex = await Bun.file(dist + 'sitemap-index.xml').text();
    const match = sitemapIndex.match(/<loc>([^<]+)<\/loc>/);
    const sitemapFile = match![1]!.replace('https://jeroenwever.com/', '');
    const sitemap = await Bun.file(dist + sitemapFile).text();
    expect(sitemap).not.toContain('/404');
  });
});
