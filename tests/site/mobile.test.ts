import { test, expect, afterAll } from 'bun:test';
import { chromium } from 'playwright';
import { serveDist } from '../../scripts/serve-dist';

const { server, origin } = serveDist();
const browser = await chromium.launch();

afterAll(async () => {
  // Teardown only — every assertion has already run by this point.
  //
  // Three test files each hold a Chromium at module scope. That is fine on a
  // dev machine and contended on a 2-core CI runner, where browser.close()
  // wedges outright: it hangs rather than runs slow, so raising the timeout
  // just moved the failure from 5001ms to 30001ms. Bound it and move on; the
  // browser is reaped when the test process exits either way.
  await Promise.race([
    (async () => {
      await Promise.all(browser.contexts().map((c) => c.close()));
      await browser.close();
    })(),
    new Promise((resolve) => setTimeout(resolve, 8_000)),
  ]);
  // fetch() against the dist server leaves keep-alive sockets open, and an
  // unforced stop() waits on them forever.
  server.stop(true);
}, 30_000);

for (const path of ['/', '/nl/'] as const) {
  test(`${path} has no horizontal overflow at 360px`, async () => {
    const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
    await page.goto(origin + path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBe(0);
    await page.close();
  });

  /* The bar is in flow and transparent, matching sugarrush.dev — it scrolls
     away rather than sticking, so the band runs unbroken behind the page. */
  test(`${path} topbar scrolls with the page at 360px`, async () => {
    const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
    await page.goto(origin + path);
    const bar = page.locator('.topbar');
    expect(await bar.evaluate((el) => getComputedStyle(el).position)).toBe('static');
    expect(await bar.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');

    await page.evaluate(() => window.scrollTo(0, 1500));
    const top = await bar.evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeLessThan(0);
    await page.close();
  });

  test(`${path} content is boxed on a wide viewport`, async () => {
    const page = await browser.newPage({ viewport: { width: 2200, height: 900 } });
    await page.goto(origin + path);
    const { width, max } = await page.evaluate(() => {
      const el = document.querySelector('main')!;
      return { width: el.getBoundingClientRect().width, max: parseFloat(getComputedStyle(el).maxWidth) };
    });
    expect(width).toBeLessThanOrEqual(max + 1);
    expect(width).toBeLessThan(1400);
    await page.close();
  });
}
