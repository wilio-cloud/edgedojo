import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../public');

const ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F1B33"/>
      <stop offset="100%" stop-color="#060A13"/>
    </linearGradient>
    <linearGradient id="bull" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#34D399"/>
    </linearGradient>
    <linearGradient id="bear" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FB7185"/>
      <stop offset="100%" stop-color="#E11D48"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect x="28" y="28" width="456" height="456" rx="96" fill="none" stroke="#1E293B" stroke-width="8"/>
  <line x1="68" y1="344" x2="444" y2="344" stroke="#F59E0B" stroke-width="7" stroke-dasharray="16 12" opacity="0.88"/>
  <line x1="138" y1="184" x2="138" y2="394" stroke="#F43F5E" stroke-width="14" stroke-linecap="round"/>
  <rect x="112" y="218" width="52" height="128" rx="10" fill="url(#bear)"/>
  <line x1="232" y1="208" x2="232" y2="432" stroke="#34D399" stroke-width="14" stroke-linecap="round"/>
  <rect x="206" y="242" width="52" height="80" rx="10" fill="url(#bull)"/>
  <line x1="326" y1="120" x2="326" y2="306" stroke="#34D399" stroke-width="14" stroke-linecap="round"/>
  <rect x="300" y="146" width="52" height="136" rx="10" fill="url(#bull)"/>
  <line x1="410" y1="78" x2="410" y2="202" stroke="#38BDF8" stroke-width="14" stroke-linecap="round"/>
  <rect x="386" y="96" width="48" height="82" rx="10" fill="#38BDF8"/>
</svg>
`;

async function main() {
  const browser = await chromium.launch({
    executablePath:
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });

  // 1. Render square app icons (180, 192, 512)
  for (const [filename, size] of [
    ['apple-touch-icon.png', 180],
    ['icon-192.png', 192],
    ['icon-512.png', 512],
  ]) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<!doctype html><html><body style="margin:0;padding:0;overflow:hidden;background:#060A13;width:${size}px;height:${size}px;">${ICON_SVG}</body></html>`
    );
    await page.screenshot({ path: path.join(PUBLIC_DIR, filename) });
    await page.close();
    console.log(`[OK] Generated ${filename} (${size}x${size})`);
  }

  // 2. Render 1200x630 OpenGraph Social Card for WhatsApp & Discord
  const ogPage = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await ogPage.setContent(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          body {
            width: 1200px;
            height: 630px;
            background: radial-gradient(circle at 82% 24%, rgba(16,185,129,0.18), transparent 45%),
                        radial-gradient(circle at 18% 85%, rgba(56,189,248,0.14), transparent 48%),
                        linear-gradient(135deg, #09101F 0%, #050811 100%);
            color: #F8FAFC;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 68px 80px;
            position: relative;
            overflow: hidden;
          }
          .grid-bg {
            position: absolute;
            inset: 0;
            background-image: linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px);
            background-size: 48px 48px;
          }
          .left { position: relative; z-index: 2; max-width: 690px; }
          .brand-row { display: flex; align-items: center; gap: 18px; margin-bottom: 26px; }
          .logo-wrap { width: 68px; height: 68px; border-radius: 18px; overflow: hidden; border: 2px solid #1E293B; box-shadow: 0 12px 30px rgba(16,185,129,0.2); }
          .wordmark { font-size: 40px; font-weight: 900; letter-spacing: -0.03em; }
          .wordmark span { color: #34D399; }
          .pro-pill { padding: 5px 12px; border-radius: 8px; background: rgba(16,185,129,0.16); border: 1px solid rgba(52,211,153,0.45); color: #6EE7B7; font-size: 15px; font-weight: 800; letter-spacing: 0.08em; }
          h1 { font-size: 54px; line-height: 1.08; font-weight: 900; letter-spacing: -0.025em; margin-bottom: 20px; }
          h1 em { font-style: normal; color: #34D399; }
          p { font-size: 24px; line-height: 1.42; color: #94A3B8; margin-bottom: 32px; }
          .badges { display: flex; gap: 14px; flex-wrap: wrap; }
          .badge { padding: 10px 18px; border-radius: 12px; background: rgba(15,23,42,0.92); border: 1px solid #1E293B; font-size: 17px; font-weight: 700; color: #E2E8F0; }
          .badge.rose { border-color: rgba(244,63,94,0.45); color: #FDA4AF; }
          .badge.violet { border-color: rgba(139,92,246,0.45); color: #DDD6FE; }
          .badge.cyan { border-color: rgba(56,189,248,0.45); color: #BAE6FD; }
          .right-card {
            position: relative;
            z-index: 2;
            width: 320px;
            height: 320px;
            border-radius: 56px;
            overflow: hidden;
            border: 3px solid rgba(52,211,153,0.35);
            box-shadow: 0 30px 70px rgba(0,0,0,0.65), 0 0 60px rgba(16,185,129,0.18);
          }
        </style>
      </head>
      <body>
        <div class="grid-bg"></div>
        <div class="left">
          <div class="brand-row">
            <div class="logo-wrap">${ICON_SVG}</div>
            <div class="wordmark">EDGE<span>DOJO</span></div>
            <div class="pro-pill">MÀSTER PRO</div>
          </div>
          <h1>Domina el <em>Price Action</em> sobre Mercat Real.</h1>
          <p>36 pantalles tàctiques, sessions històriques a cegues i gestió matemàtica del risc abans d’operar en directe.</p>
          <div class="badges">
            <div class="badge rose">⚡ MNQ Scalping</div>
            <div class="badge violet">🧭 Crypto Swing</div>
            <div class="badge cyan">🛡️ Risc 1R &amp; Escalat</div>
          </div>
        </div>
        <div class="right-card">${ICON_SVG}</div>
      </body>
    </html>
  `);
  await ogPage.screenshot({ path: path.join(PUBLIC_DIR, 'og-card.png') });
  await ogPage.close();
  console.log('[OK] Generated og-card.png (1200x630)');

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
