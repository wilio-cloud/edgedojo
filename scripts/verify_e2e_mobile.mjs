import { chromium } from 'playwright-core';
import path from 'node:path';

const ARTIFACT_DIR =
  '/Users/guillemriusviladomiu/.gemini/antigravity/brain/8d55a6c4-5f2c-4577-b770-9e63079de7e4';

async function main() {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 400, height: 860 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`CONSOLE_ERR: ${msg.text()}`);
  });

  await page.goto('http://localhost:5178/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(450);

  // 1. Campaign Map Screen (36 stages / 108 stars + 4-tab bar)
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, '01_campaign_map.png'),
  });
  console.log('[OK] Captured 01_campaign_map.png');

  // 2. Click Resume CTA -> Opens Masterclass Lesson Modal & test Aprofundiment tab
  await page.getByRole('button', { name: /Continuar:/i }).click();
  await page.waitForTimeout(350);
  const deepDiveBtn = page.getByRole('button', { name: /Aprofundiment/i });
  if (await deepDiveBtn.isVisible()) {
    await deepDiveBtn.click();
    await page.waitForTimeout(250);
  }
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, '02_micro_lesson.png'),
  });
  console.log('[OK] Captured 02_micro_lesson.png');

  // 3. Complete Lesson -> Enters Stage 1.1 Radar Mode
  await page.getByRole('button', { name: /Entès/i }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Punt B/i }).click();
  await page.getByRole('button', { name: /Confirmar Lectura Visual/i }).click();
  await page.waitForTimeout(2200);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, '03_radar_xray_debrief.png'),
  });
  console.log('[OK] Captured 03_radar_xray_debrief.png');

  // 4. Back to Campaign, unlock Free mode, open Stage 4.4 (Real MNQ 5m/15m Multi-Timeframe Scalp Execution!)
  await page.getByRole('button', { name: 'Tornar' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Guiat/i }).click();
  await page.waitForTimeout(250);
  await page
    .getByRole('button', { name: /4\.4 · MNQ 5m \/ 15m Real/i })
    .click();
  await page.waitForTimeout(500);

  // Click LONG to display interactive R:R handles + Live MNQ DOM contract sizing badge!
  await page.getByRole('button', { name: 'LONG', exact: true }).click();
  await page.waitForTimeout(450);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, '04_execution_rr_handles.png'),
  });
  console.log('[OK] Captured 04_execution_rr_handles.png');

  // Execute order and capture X-Ray + Real MNQ=F Asset Reveal!
  await page.getByRole('button', { name: /Executar LONG/i }).click();
  await page.waitForTimeout(3200);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, '05_real_market_reveal.png'),
  });
  console.log('[OK] Captured 05_real_market_reveal.png');

  // 5. Return & check Drill Gym (MNQ + Crypto)
  await page.getByRole('button', { name: 'Tornar' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Gimnàs Real' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, '06_drill_gym.png'),
  });
  console.log('[OK] Captured 06_drill_gym.png');

  // 6. Verify NEW Risk Master & Scaling Module (all 4 sub-tabs!)
  await page.getByRole('button', { name: 'Risc & Escalat' }).click();
  await page.waitForTimeout(350);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, '09_risk_master_doctrine.png'),
  });
  console.log('[OK] Captured 09_risk_master_doctrine.png');

  await page.getByRole('button', { name: 'Calc MNQ' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, '10_risk_calc_mnq.png'),
  });
  console.log('[OK] Captured 10_risk_calc_mnq.png');

  await page.getByRole('button', { name: 'Calc Cripto' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, '11_risk_calc_crypto.png'),
  });
  console.log('[OK] Captured 11_risk_calc_crypto.png');

  await page.getByRole('button', { name: 'Escalat', exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, '12_risk_scaling_simulator.png'),
  });
  console.log('[OK] Captured 12_risk_scaling_simulator.png');

  // 7. Verify Readiness Passport & Checklist
  await page.getByRole('button', { name: 'Passaport Pro' }).click();
  await page.waitForTimeout(350);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, '07_readiness_passport.png'),
  });
  await page.getByRole('button', { name: /He identificat l’estructura HTF/i }).click();
  await page.getByRole('button', { name: /Risc calculat exacte/i }).click();
  await page.waitForTimeout(250);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, '08_pre_trade_checklist.png'),
  });
  console.log('[OK] Captured 07_readiness_passport.png & 08_pre_trade_checklist.png');

  await browser.close();

  if (errors.length > 0) {
    console.error('BROWSER ERRORS DETECTED:', errors);
    process.exit(1);
  }
  console.log('[SUCCESS] Zero console/page errors across entire Phase 2 mobile flow!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
