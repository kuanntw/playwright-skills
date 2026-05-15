import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export async function expectVisible(locator: Locator) {
  await expect(locator).toBeVisible();
}

export async function expectNonEmptyText(locator: Locator) {
  await expect(locator).toHaveText(/.+/);
}
