import { test, expect } from '@playwright/test';
import { config } from '../../../skills/readonly-adapters/template/config';
import { appendPerfMetric, capturePagePerf } from '../../../skills/readonly-core/reporters/perfMetrics';

test.describe('@readonly @smoke', () => {
  test('home page is reachable', async ({ page }, testInfo) => {
    const url = `${config.baseURL}${config.routes.home}`;
    await page.goto(url);
    await expect(page.locator(config.selectors.nav)).toBeVisible();
    await appendPerfMetric(await capturePagePerf(page, testInfo, url));
  });
});
