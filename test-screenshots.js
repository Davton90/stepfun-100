import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const REPO_DIR = 'Q:\\alphine\\stepfun\\stepfun-100';
const SCREENSHOT_DIR = path.join(REPO_DIR, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const indexPath = `file:///${REPO_DIR.replace(/\\/g, '/')}/index.html`;
  console.log('Opening index:', indexPath);
  await page.goto(indexPath, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const items = await page.locator('.item').all();
  console.log(`Found ${items.length} items`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const id = await item.getAttribute('data-id');
    const name = await item.locator('.name').textContent();
    console.log(`[${String(i + 1).padStart(3, '0')}/${items.length}] ${name}`);

    await item.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    const screenshotPath = path.join(SCREENSHOT_DIR, `design_${id}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`  Screenshot saved: design_${id}.png`);

    await page.goBack({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
  }

  await browser.close();
  console.log('\nDone! Screenshots saved to:', SCREENSHOT_DIR);
})();
