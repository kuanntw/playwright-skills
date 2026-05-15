import { test, expect } from '@playwright/test';
import { config } from '../../../skills/readonly-adapters/template/config';

test.describe('@readonly @contract', () => {
  test('list endpoint responds with success', async ({ request }) => {
    const res = await request.get(`${config.baseURL}${config.routes.list}`);
    expect(res.status()).toBeLessThan(500);
  });
});
