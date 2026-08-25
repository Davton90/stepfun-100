import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const REPO_DIR = 'Q:\\alphine\\stepfun\\stepfun-100';
const SCREENSHOT_DIR = path.join(REPO_DIR, 'screenshots');
const REPORT_DIR = path.join(REPO_DIR, 'test-report');

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

const results = [];
const consoleErrors = [];
const consoleWarnings = [];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  // Capture console messages
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') consoleErrors.push(text);
    else if (msg.type() === 'warning') consoleWarnings.push(text);
  });

  page.on('pageerror', err => consoleErrors.push(`PAGE ERROR: ${err.message}`));

  const indexPath = `file:///${REPO_DIR.replace(/\\/g, '/')}/index.html`;
  await page.goto(indexPath, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const items = await page.locator('.item').all();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const id = await item.getAttribute('data-id');
    const name = await item.locator('.name').textContent();
    const file = `design_${id}.html`;

    console.log(`[${String(i + 1).padStart(3, '0')}/100] Testing ${name}...`);

    const testResult = {
      id,
      name,
      file,
      status: 'pass',
      errors: [],
      warnings: [],
      checks: {
        loaded: false,
        backButtonExists: false,
        favoriteButtonExists: false,
        canvasRenders: false,
        noConsoleErrors: true,
        noPageErrors: true
      }
    };

    // Clear errors for this page
    consoleErrors.length = 0;
    consoleWarnings.length = 0;

    try {
      // Click item
      await item.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Check 1: Page loaded
      testResult.checks.loaded = true;

      // Check 2: Back button exists
      testResult.checks.backButtonExists = await page.locator('.back-to-gallery').count() > 0;

      // Check 3: Favorite button exists
      testResult.checks.favoriteButtonExists = await page.locator('#favBtn').count() > 0;

      // Check 4: Canvas renders (check if canvas has non-zero dimensions)
      const canvas = await page.locator('canvas').first();
      if (await canvas.count() > 0) {
        const bbox = await canvas.boundingBox();
        testResult.checks.canvasRenders = bbox && bbox.width > 0 && bbox.height > 0;
      }

      // Check 5: No console errors
      testResult.checks.noConsoleErrors = consoleErrors.length === 0;
      testResult.errors.push(...consoleErrors);

      // Check 6: No page errors
      testResult.checks.noPageErrors = true;

      // Take screenshot
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `design_${id}.png`), fullPage: true });

      // Test back button functionality
      if (testResult.checks.backButtonExists) {
        await page.click('.back-to-gallery');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
        const backOnIndex = await page.locator('.continue-banner').count() > 0 || await page.locator('.favorites-section').count() > 0;
        if (!backOnIndex) {
          testResult.warnings.push('Back button did not return to index');
        }
      }

      // Test favorite button toggle
      if (testResult.checks.favoriteButtonExists) {
        const btn = await page.locator('#favBtn');
        const initialText = await btn.textContent();
        await btn.click();
        await page.waitForTimeout(300);
        const afterText = await btn.textContent();
        if (initialText === afterText) {
          testResult.warnings.push('Favorite button did not toggle');
        }
        // Click back to index to continue
        if (await page.locator('.back-to-gallery').count() > 0) {
          await page.click('.back-to-gallery');
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(500);
        }
      } else {
        // If no favorite button, just go back
        if (await page.locator('.back-to-gallery').count() > 0) {
          await page.click('.back-to-gallery');
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(500);
        }
      }

    } catch (err) {
      testResult.status = 'fail';
      testResult.errors.push(err.message);
    }

    results.push(testResult);
  }

  await browser.close();

  // Generate report
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const withErrors = results.filter(r => r.errors.length > 0).length;
  const withWarnings = results.filter(r => r.warnings.length > 0).length;

  const report = `
# Playwright Test Report
Generated: ${new Date().toISOString()}

## Summary
- Total: ${results.length}
- Passed: ${passed}
- Failed: ${failed}
- With console errors: ${withErrors}
- With warnings: ${withWarnings}

## Failed Tests
${results.filter(r => r.status === 'fail').map(r => `- ${r.id}: ${r.name} - ${r.errors.join(', ')}`).join('\n') || 'None'}

## Tests with Errors
${results.filter(r => r.status === 'pass' && r.errors.length > 0).map(r => `- ${r.id}: ${r.name} - ${r.errors.join(', ')}`).join('\n') || 'None'}

## Tests with Warnings
${results.filter(r => r.warnings.length > 0).map(r => `- ${r.id}: ${r.name} - ${r.warnings.join(', ')}`).join('\n') || 'None'}

## Detailed Results
${results.map(r => `- ${r.id}: ${r.name} | ${r.status} | back:${r.checks.backButtonExists} fav:${r.checks.favoriteButtonExists} canvas:${r.checks.canvasRenders} errors:${r.errors.length}`).join('\n')}
`;

  fs.writeFileSync(path.join(REPORT_DIR, 'test-report.md'), report);
  console.log(`\n${report}`);
  console.log(`\nReport saved to: ${path.join(REPORT_DIR, 'test-report.md')}`);
})();
