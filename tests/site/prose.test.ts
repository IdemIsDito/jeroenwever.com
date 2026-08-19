import { describe, test, expect } from 'bun:test';
import { existsSync } from 'node:fs';

const dist = new URL('../../dist/', import.meta.url).pathname;
if (!existsSync(dist)) throw new Error('dist/ missing — run `bun run build` before test:site');

/**
 * Guards against the writing patterns that make copy read as machine-written.
 * Asserting on the built HTML rather than the content files catches every
 * source at once: JSON content, i18n dictionaries and markup alike.
 */
function visibleText(html: string): string {
  const body = html.slice(html.indexOf('<body'));
  return body
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#8212;|&mdash;/g, '—');
}

const pages = ['index.html', 'nl/index.html', '404.html'] as const;

describe('prose', () => {
  for (const page of pages) {
    test(`${page} contains no em dashes`, async () => {
      const text = visibleText(await Bun.file(dist + page).text());
      const hits = [...text.matchAll(/.{40}—.{40}/g)].map((m) => m[0].replace(/\s+/g, ' '));
      // An em dash is the loudest AI tell in this copy. Ranges use an en dash,
      // which is the correct character for a span and reads as typography.
      expect(hits).toEqual([]);
    });
  }

  for (const page of pages) {
    test(`${page} avoids negative-contrast constructions`, async () => {
      const text = visibleText(await Bun.file(dist + page).text());
      const patterns = [
        /\bnot just\b[^.]{0,40}\bbut\b/i,
        /\bis ?n[o']t\b[^.]{0,30},\s*it'?s\b/i,
        /\bit'?s not\b[^.]{0,30}\bit'?s\b/i,
      ];
      expect(patterns.filter((p) => p.test(text)).map(String)).toEqual([]);
    });
  }
});
