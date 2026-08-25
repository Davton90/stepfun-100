import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const REPO_DIR = 'Q:\\alphine\\stepfun\\stepfun-100';
const SCREENSHOT_DIR = path.join(REPO_DIR, 'screenshots');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const indexPath = `file:///${REPO_DIR.replace(/\\/g, '/')}/index.html`;
  await page.goto(indexPath, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const items = await page.locator('.item').all();
  const missing = [];

  for (const item of items) {
    const id = await item.getAttribute('data-id');
    const screenshotPath = path.join(SCREENSHOT_DIR, `design_${id}.png`);
    if (!fs.existsSync(screenshotPath)) missing.push({ item, id });
  }

  console.log(`Missing screenshots: ${missing.length}`);
  for (let i = 0; i < missing.length; i++) {
    const { item, id } = missing[i];
    const name = await item.locator('.name').textContent();
    console.log(`[${String(i + 1).padStart(3, '0')}/${missing.length}] ${name}`);

    await item.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `design_${id}.png`), fullPage: true });
    console.log(`  Saved design_${id}.png`);

    await page.goBack({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
  }

  await browser.close();
  console.log('Done!');
})();
