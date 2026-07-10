import { test, expect, afterAll } from 'bun:test';
import { chromium } from 'playwright';
import { serveDist } from '../../scripts/serve-dist';

const { server, origin } = serveDist();
const browser = await chromium.launch();

afterAll(async () => {
  await browser.close();
  server.stop();
});

test('toggle cycles system → light → dark and persists override', async () => {
  const page = await browser.newPage();
  await page.goto(origin + '/');

  const toggle = page.locator('#theme-toggle');
  expect(await toggle.count()).toBe(1);

  // default: system — no data-theme attribute, nothing stored
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBeUndefined();

  // first click → light override
  await toggle.click();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');

  // second click → dark override
  await toggle.click();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');

  // reload → override re-applied before interaction
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');

  // third click → back to system, override cleared
  await page.locator('#theme-toggle').click();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBeUndefined();
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();

  await page.close();
});

test('toggle has an accessible name reflecting current state', async () => {
  const page = await browser.newPage();
  await page.goto(origin + '/');
  const label = await page.locator('#theme-toggle').getAttribute('aria-label');
  expect(label).toContain('Theme');
  expect(label).toContain('System');
  await page.close();
});
