import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export async function expectVisible(locator: Locator) {
  await expect(locator).toBeVisible();
}

export async function expectNonEmptyText(locator: Locator) {
  await expect(locator).toHaveText(/.+/);
}

// Template contract: a successful HTML read, not an authorization/error page.
export async function expectHTMLReadResponse(response: import('@playwright/test').APIResponse, marker: string) {
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/html');
  expect(await response.text()).toContain(marker);
}
