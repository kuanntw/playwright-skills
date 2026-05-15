import { test, expect } from '@playwright/test';
import { config } from '../../../skills/readonly-adapters/template/config';
import { appendPerfMetric, capturePagePerf } from '../../../skills/readonly-core/reporters/perfMetrics';

test.describe('@readonly @read-model', () => {
  test('list page renders container', async ({ page }, testInfo) => {
    const url = `${config.baseURL}${config.routes.list}`;
    await page.goto(url);
    await expect(page.locator(config.selectors.listContainer)).toBeVisible();
    await appendPerfMetric(await capturePagePerf(page, testInfo, url));
  });

  test('detail page renders title', async ({ page }, testInfo) => {
    const url = `${config.baseURL}${config.routes.detail}`;
    await page.goto(url);
    await expect(page.locator(config.selectors.detailTitle)).toBeVisible();
    await appendPerfMetric(await capturePagePerf(page, testInfo, url));
  });
});
