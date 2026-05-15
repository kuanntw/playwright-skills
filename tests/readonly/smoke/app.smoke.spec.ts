import { test, expect } from '@playwright/test';
import { config } from '../../../skills/readonly-adapters/template/config';

test.describe('@readonly @smoke', () => {
  test('home page is reachable', async ({ page }) => {
    await page.goto(`${config.baseURL}${config.routes.home}`);
    await expect(page.locator(config.selectors.nav)).toBeVisible();
  });
});
