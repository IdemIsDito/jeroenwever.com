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

for (const path of ['/', '/nl/'] as const) {
  test(`CTA links resolve to real targets (${path})`, async () => {
    const page = await browser.newPage();
    await page.goto(origin + path);

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
}
