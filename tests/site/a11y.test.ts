import { test, expect, afterAll } from 'bun:test';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { serveDist } from '../../scripts/serve-dist';

const { server, origin } = serveDist();
const browser = await chromium.launch();

afterAll(async () => {
  // browser.newPage() opens a context that page.close() does not close; a leaked
  // one makes browser.close() hang rather than merely run slow. And any fetch()
  // against the server leaves a keep-alive socket, which an unforced stop()
  // waits on forever — both only ever showed up on CI.
  await Promise.all(browser.contexts().map((c) => c.close()));
  await browser.close();
  server.stop(true);
}, 30_000);


/*
 * WCAG 1.4.3 exempts text that is part of a logo or brand name from the
 * contrast minimum, and the brand system states the exception outright: the
 * logotype keeps full-strength raspberry on both themes. Only logotype nodes
 * are dropped — a color-contrast violation naming anything else still fails.
 */
type Violation = { id: string; impact?: string | null; nodes: { html: string }[] };

function gated(violations: Violation[]) {
  return violations
    .map((v) =>
      v.id === "color-contrast"
        ? { ...v, nodes: v.nodes.filter((n) => !n.html.includes("data-logotype")) }
        : v
    )
    .filter((v) => v.nodes.length > 0)
    .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html) }));
}

// The sheet holds the only theme, language and section controls, so it has to pass too.
for (const colorScheme of ["light", "dark"] as const) {
  test(`the open menu sheet has zero WCAG 2.2 AA violations (${colorScheme})`, async () => {
    const context = await browser.newContext({ colorScheme });
    const page = await context.newPage();
    await page.goto(origin + "/");
    await page.click("[data-menu-open]");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();

    expect(gated(results.violations)).toEqual([]);
    await context.close();
  });
}

for (const path of ['/', '/nl/'] as const) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`${path} (${colorScheme}) has zero WCAG 2.2 AA violations`, async () => {
      const context = await browser.newContext({ colorScheme });
      const page = await context.newPage();
      await page.goto(origin + path);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(gated(results.violations)).toEqual([]);

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
