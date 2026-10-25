import { test, expect } from '../../../skills/readonly-core/fixtures/readOnlyFixture';
import { config } from '../../../skills/readonly-adapters/template/config';
import { appendPerfMetric, capturePagePerf } from '../../../skills/readonly-core/reporters/perfMetrics';

test.describe('@readonly @read-model', () => {
  test('list page renders container', async ({ page }, testInfo) => {
    const url = config.routes.list;
    await page.goto(url);
    await expect(page.locator(config.selectors.listContainer)).toBeVisible();
    await appendPerfMetric(await capturePagePerf(page, testInfo, page.url()));
  });

  test('detail page renders title', async ({ page }, testInfo) => {
    const url = config.routes.detail;
    await page.goto(url);
    await expect(page.locator(config.selectors.detailTitle)).toBeVisible();
    await appendPerfMetric(await capturePagePerf(page, testInfo, page.url()));
  });
});
