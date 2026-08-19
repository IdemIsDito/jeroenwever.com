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
