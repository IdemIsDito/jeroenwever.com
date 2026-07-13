import { chromium } from 'playwright';
import { locales, cvFileName } from '../src/i18n';
import { serveDist } from './serve-dist';

const { server, origin, dist } = serveDist();
const browser = await chromium.launch();

try {
  for (const locale of locales) {
    const page = await browser.newPage();

    await page.goto(`${origin}/cv/${locale}/`, { waitUntil: 'networkidle' });
    await page.pdf({
      path: `${dist}${cvFileName(locale)}`,
      format: 'A4',
      printBackground: true,
      tagged: true,
      // Renderer margins apply to every page, unlike body padding.
      margin: { top: '14mm', right: '16mm', bottom: '14mm', left: '16mm' },
    });

    await page.setViewportSize({ width: 1200, height: 630 });
    await page.goto(`${origin}/og/${locale}/`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${dist}og-${locale}.png` });

    await page.close();
    console.log(`✓ ${cvFileName(locale)} + og-${locale}.png`);
  }
} finally {
  await browser.close();
  server.stop();
}

// Fail the build loudly if anything is missing or suspiciously small.
for (const locale of locales) {
  const pdf = Bun.file(`${dist}${cvFileName(locale)}`);
  if (!(await pdf.exists()) || pdf.size < 10_000) {
    console.error(`${cvFileName(locale)} missing or too small (${pdf.size} bytes)`);
    process.exit(1);
  }
}
