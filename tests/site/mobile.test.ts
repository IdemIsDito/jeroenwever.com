import { test, expect, afterAll } from 'bun:test';
import { chromium } from 'playwright';
import { serveDist } from '../../scripts/serve-dist';

const { server, origin } = serveDist();
const browser = await chromium.launch();

afterAll(async () => {
  await browser.close();
  server.stop();
});

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

  test(`${path} topbar sticks to the top when scrolled at 360px`, async () => {
    const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
    await page.goto(origin + path);
    await page.evaluate(() => window.scrollTo(0, 1500));
    const top = await page.evaluate(
      () => document.querySelector('.topbar')!.getBoundingClientRect().top
    );
    expect(top).toBe(0);
    await page.close();
  });
}
