import { test, expect, afterAll } from 'bun:test';
import { chromium } from 'playwright';
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
