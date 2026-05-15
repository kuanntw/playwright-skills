import { test, expect } from '@playwright/test';
import { config } from '../../../skills/readonly-adapters/template/config';

test.describe('@readonly @read-model', () => {
  test('list page renders container', async ({ page }) => {
    await page.goto(`${config.baseURL}${config.routes.list}`);
    await expect(page.locator(config.selectors.listContainer)).toBeVisible();
  });

  test('detail page renders title', async ({ page }) => {
    await page.goto(`${config.baseURL}${config.routes.detail}`);
    await expect(page.locator(config.selectors.detailTitle)).toBeVisible();
  });
});
