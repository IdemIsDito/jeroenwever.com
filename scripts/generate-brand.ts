/**
 * Renders LinkedIn brand assets from the design system.
 *
 * Output goes to brand/, not dist/ — these are not site assets. Fonts resolve
 * because the temp page lives in the repo root and points at node_modules with
 * a relative path, which file:// URLs handle.
 */
import { chromium } from 'playwright';
import { unlink } from 'node:fs/promises';

const OUT = new URL('../brand/', import.meta.url).pathname;
const TMP = new URL('../.brand-render.html', import.meta.url).pathname;

const FONTS = `
<link rel="stylesheet" href="node_modules/@fontsource-variable/space-grotesk/index.css">
<link rel="stylesheet" href="node_modules/@fontsource/ibm-plex-mono/400.css">
<link rel="stylesheet" href="node_modules/@fontsource/ibm-plex-mono/600.css">`;

const BASE = `
  *{margin:0;box-sizing:border-box}
  body{background:#120e13;color:#fbf7f3;font-family:'Space Grotesk Variable',Helvetica,Arial,sans-serif;
       position:relative;overflow:hidden;display:flex;align-items:center}
  .band span{position:absolute;top:-120px;bottom:-120px;transform:skewX(-16deg)}
  .kicker{font-family:'IBM Plex Mono',monospace;font-weight:600;letter-spacing:0.14em;
          text-transform:uppercase;color:oklch(0.88 0.13 85)}
  .bars{display:flex}
  .bars i{border-radius:3px;transform:skewX(-16deg)}
  .bars i:nth-child(1){background:oklch(0.68 0.21 20)}
  .bars i:nth-child(2){background:oklch(0.88 0.13 85)}
  .bars i:nth-child(3){background:oklch(0.51 0.10 205)}
  .tail{color:oklch(0.68 0.21 20)}`;

/** Three stripes, widest outermost. Right-anchored as on the sites, or
 *  left-anchored on assets whose content has to sit right of an overlay. */
const band = (w: number, m: number, g: number, side: 'right' | 'left' = 'right') => `
  <div class="band">
    <span style="${side}:${-m}px;width:${w}px;background:oklch(0.30 0.05 320)"></span>
    <span style="${side}:${w - m + g}px;width:${Math.round(w * 0.22)}px;background:oklch(0.36 0.06 320)"></span>
    <span style="${side}:${w - m + g + Math.round(w * 0.22) + g}px;width:${Math.round(w * 0.08)}px;background:oklch(0.26 0.04 320)"></span>
  </div>`;

const mark = (barW: number, barH: number, gap: number, type: number) => `
  <span style="display:inline-flex;align-items:center;gap:${Math.round(barW * 1.6)}px">
    <span class="bars" style="gap:${gap}px">
      <i style="width:${barW}px;height:${barH}px"></i>
      <i style="width:${barW}px;height:${barH}px"></i>
      <i style="width:${barW}px;height:${barH}px"></i>
    </span>
    <span style="font-size:${type}px;font-weight:700;letter-spacing:-0.03em">jeroenwever<span class="tail">.</span></span>
  </span>`;

const assets = [
  {
    // The profile photo sits over the lower left and crops differently per
    // breakpoint, so content is right-aligned and the band moves left.
    name: 'linkedin-banner',
    w: 1584,
    h: 396,
    html: `${band(300, 60, 26, 'left')}
      <div style="position:relative;margin-left:auto;padding-right:96px;display:flex;
                  flex-direction:column;align-items:flex-end;gap:22px;text-align:right">
        ${mark(16, 54, 7, 44)}
        <p class="kicker" style="font-size:19px">Freelance staff-level engineer</p>
      </div>`,
  },
  {
    name: 'linkedin-post',
    w: 1200,
    h: 627,
    html: `${band(260, 50, 22)}
      <div style="position:relative;padding:0 96px;display:flex;flex-direction:column;gap:28px">
        <p class="kicker" style="font-size:20px">Available for assignments</p>
        <h1 style="font-size:96px;line-height:0.94;font-weight:700;letter-spacing:-0.045em;max-width:14ch">Jeroen Wever</h1>
        <p style="font-size:26px;color:rgba(251,247,243,0.72);max-width:42ch">Freelance staff-level engineer. Almost 20 years of building web products people actually use.</p>
        ${mark(11, 36, 5, 28)}
      </div>`,
  },
];

const browser = await chromium.launch();
try {
  for (const a of assets) {
    const page = await browser.newPage({ viewport: { width: a.w, height: a.h } });
    await Bun.write(
      TMP,
      `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE}
       body{width:${a.w}px;height:${a.h}px}</style></head><body>${a.html}</body></html>`
    );
    await page.goto(`file://${TMP}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${OUT}${a.name}.png` });
    await page.close();
    console.log(`✓ brand/${a.name}.png (${a.w}x${a.h})`);
  }
} finally {
  await browser.close();
  await unlink(TMP).catch(() => {});
}
