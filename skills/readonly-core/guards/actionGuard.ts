import type { Locator } from '@playwright/test';

export async function safeClick(locator: Locator) {
  const tag = (await locator.evaluate((el) => el.tagName)).toLowerCase();
  const type = await locator.getAttribute('type');
  const danger = await locator.getAttribute('data-danger');

  if ((tag === 'button' && type === 'submit') || danger === 'true') {
    throw new Error('Blocked unsafe click under read-only policy');
  }

  await locator.click();
}
