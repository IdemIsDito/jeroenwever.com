import { chromium } from 'playwright';
import { locales } from '../src/i18n';
import { serveDist } from './serve-dist';

const { server, origin, dist } = serveDist();
const browser = await chromium.launch();

try {
  for (const locale of locales) {
    const page = await browser.newPage();

    await page.goto(`${origin}/cv/${locale}/`, { waitUntil: 'networkidle' });
    await page.pdf({
      path: `${dist}cv-${locale}.pdf`,
      format: 'A4',
      printBackground: true,
      tagged: true,
    });

    await page.setViewportSize({ width: 1200, height: 630 });
    await page.goto(`${origin}/og/${locale}/`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${dist}og-${locale}.png` });

    await page.close();
    console.log(`✓ cv-${locale}.pdf + og-${locale}.png`);
  }
} finally {
  await browser.close();
  server.stop();
}

// Fail the build loudly if anything is missing or suspiciously small.
for (const locale of locales) {
  const pdf = Bun.file(`${dist}cv-${locale}.pdf`);
  if (!(await pdf.exists()) || pdf.size < 10_000) {
    console.error(`cv-${locale}.pdf missing or too small (${pdf.size} bytes)`);
    process.exit(1);
  }
}
