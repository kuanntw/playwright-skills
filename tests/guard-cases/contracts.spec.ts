import { test, expect } from '../../skills/readonly-core/fixtures/readOnlyFixture';
import { expectHTMLReadResponse } from '../../skills/readonly-core/assertions/readAssertions';

for (const path of ['/status/401', '/status/403', '/status/404', '/status/500', '/redirect', '/invalid-html', '/wrong-media']) {
  test(`allowed: contract rejects ${path}`, async ({ request }, testInfo) => {
    const response = await request.get(path, { maxRedirects: 0 });
    await expect(expectHTMLReadResponse(response, 'data-testid="list-container"')).rejects.toThrow();
    await testInfo.attach('body-completed', { body: 'true', contentType: 'text/plain' });
  });
}
