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

test('theme pills apply, persist and clear overrides', async () => {
  const page = await browser.newPage();
  await page.goto(origin + '/');

  // Theme never sits in the header bar — it lives in the sheet.
  expect(await page.locator('#theme-select').count()).toBe(0);
  await page.click('[data-menu-open]');

  // Default: system — nothing forced, nothing stored.
  expect(await page.isChecked('#theme-system')).toBe(true);
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBeUndefined();

  // Pick dark directly — any state is reachable from any state.
  await page.click('[data-theme-opt="dark"]');
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');

  // Reload: the pre-paint inline script reapplies it, and the sheet reflects it.
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  await page.click('[data-menu-open]');
  expect(await page.isChecked('#theme-dark')).toBe(true);

  await page.click('[data-theme-opt="light"]');
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');

  // Back to system → override cleared.
  await page.click('[data-theme-opt="system"]');
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBeUndefined();
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();

  await page.close();
});

test('the theme group and the menu button carry accessible names', async () => {
  const page = await browser.newPage();
  await page.goto(origin + '/');

  expect(await page.getByRole('button', { name: 'Menu' }).count()).toBe(1);
  await page.click('[data-menu-open]');
  expect(await page.getByRole('group', { name: 'Theme' }).count()).toBe(1);

  await page.close();
});
