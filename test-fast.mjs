import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const REPO_DIR = 'Q:\\alphine\\stepfun\\stepfun-100';
const REPORT_DIR = path.join(REPO_DIR, 'test-report');

if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

const results = [];
const pageErrors = [];
const consoleErrors = [];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => pageErrors.push(err.message));

  const indexPath = `file:///${REPO_DIR.replace(/\\/g, '/')}/index.html`;
  await page.goto(indexPath, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const items = await page.locator('.item').all();
  console.log(`Testing ${items.length} pages...\n`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const id = await item.getAttribute('data-id');
    const name = await item.locator('.name').textContent();

    const result = {
      id,
      name,
      file: `design_${id}.html`,
      status: 'pass',
      errors: [],
      checks: {
        clicked: false,
        loaded: false,
        backButtonExists: false,
        favoriteButtonExists: false,
        hasCanvas: false,
        noConsoleErrors: true,
        noPageErrors: true
      }
    };

    // Clear per-page errors
    consoleErrors.length = 0;
    pageErrors.length = 0;

    try {
      await item.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(600);
      result.checks.clicked = true;
      result.checks.loaded = true;

      // Back button
      result.checks.backButtonExists = await page.locator('.back-to-gallery').count() > 0;

      // Favorite button
      result.checks.favoriteButtonExists = await page.locator('#favBtn').count() > 0;

      // Canvas
      result.checks.hasCanvas = await page.locator('canvas').count() > 0;

      // Errors
      result.checks.noConsoleErrors = consoleErrors.length === 0;
      result.checks.noPageErrors = pageErrors.length === 0;
      result.errors.push(...consoleErrors, ...pageErrors);

      // Test favorite toggle if exists
      if (result.checks.favoriteButtonExists) {
        const btn = page.locator('#favBtn');
        const before = await btn.textContent();
        await btn.click();
        await page.waitForTimeout(200);
        const after = await btn.textContent();
        if (before === after) result.errors.push('Favorite button did not toggle');
      }

      // Back to index
      if (await page.locator('.back-to-gallery').count() > 0) {
        await page.click('.back-to-gallery');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(300);
      }

      if (result.errors.length > 0) result.status = 'warn';
    } catch (err) {
      result.status = 'fail';
      result.errors.push(err.message);
    }

    results.push(result);
    process.stdout.write(`\r[${String(i + 1).padStart(3, '0')}/100] ${name}`);
  }

  await browser.close();

  const passed = results.filter(r => r.status === 'pass').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const withErrors = results.filter(r => r.errors.length > 0);

  const report = `# Playwright Test Report
Generated: ${new Date().toISOString()}

## Summary
- Total: ${results.length}
- Passed: ${passed}
- Warnings: ${warned}
- Failed: ${failed}

## Failed
${results.filter(r => r.status === 'fail').map(r => `- ${r.id}: ${r.name} - ${r.errors.join('; ')}`).join('\n') || 'None'}

## Warnings / Errors
${withErrors.map(r => `- ${r.id}: ${r.name} - ${r.errors.join('; ')}`).join('\n') || 'None'}

## All Results
${results.map(r => `- ${r.id}: ${r.name} | ${r.status} | back:${r.checks.backButtonExists} fav:${r.checks.favoriteButtonExists} canvas:${r.checks.hasCanvas} consoleErrors:${!r.checks.noConsoleErrors} pageErrors:${!r.checks.noPageErrors}`).join('\n')}
`;

  fs.writeFileSync(path.join(REPORT_DIR, 'test-report.md'), report);
  console.log('\n\n' + report);
  console.log('Report saved to:', path.join(REPORT_DIR, 'test-report.md'));
})();
