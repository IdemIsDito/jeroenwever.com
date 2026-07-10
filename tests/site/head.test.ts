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
    expect(en).toContain('name="twitter:card"');
    expect(en).toContain('favicon.svg');
  });
});
