import { test, expect, afterAll } from 'bun:test';
import { chromium } from 'playwright';
import { serveDist } from '../../scripts/serve-dist';

const { server, origin } = serveDist();
const browser = await chromium.launch();

afterAll(async () => {
  await browser.close();
  server.stop();
});

test('theme select applies, persists and clears overrides', async () => {
  const page = await browser.newPage();
  await page.goto(origin + '/');

  const select = page.locator('#theme-select');
  expect(await select.count()).toBe(1);

  // default: system — select reflects it, no data-theme attribute, nothing stored
  expect(await select.inputValue()).toBe('system');
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBeUndefined();

  // pick dark directly (no cycling needed)
  await select.selectOption('dark');
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');

  // reload → override re-applied before interaction, select shows stored value
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  expect(await page.locator('#theme-select').inputValue()).toBe('dark');

  // pick light directly from dark (any state reachable from any state)
  await page.locator('#theme-select').selectOption('light');
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');

  // back to system → override cleared
  await page.locator('#theme-select').selectOption('system');
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBeUndefined();
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();

  await page.close();
});

test('theme select has an accessible name', async () => {
  const page = await browser.newPage();
  await page.goto(origin + '/');
  // the wrapping <label> gives the select its accessible name
  expect(await page.getByLabel('Theme').count()).toBe(1);
  await page.close();
});
