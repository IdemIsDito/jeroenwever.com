import type { Browser } from 'playwright';

/** Raster sizes browsers and platforms ask for beyond the SVG favicon. */
export const ICON_SIZES = [
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
] as const;

/**
 * Rasterises public/favicon.svg — the brand mark — into the PNG sizes above.
 * The SVG is the single source: change the mark there and every raster follows.
 */
export async function generateIcons(browser: Browser, dist: string) {
  const svg = await Bun.file('public/favicon.svg').text();
  const page = await browser.newPage();

  for (const { file, size } of ICON_SIZES) {
    const sized = svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
    await page.setContent(`<style>html,body{margin:0}svg{display:block}</style>${sized}`);
    await page.setViewportSize({ width: size, height: size });
    await page.screenshot({ path: `${dist}${file}` });
  }

  await page.close();
  console.log(`✓ ${ICON_SIZES.map((i) => i.file).join(' + ')}`);
}
