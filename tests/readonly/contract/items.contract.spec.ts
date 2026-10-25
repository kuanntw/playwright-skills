import { test } from '../../../skills/readonly-core/fixtures/readOnlyFixture';
import { expectHTMLReadResponse } from '../../../skills/readonly-core/assertions/readAssertions';
import { config } from '../../../skills/readonly-adapters/template/config';

test.describe('@readonly @contract', () => {
  test('list endpoint responds with success', async ({ request }) => {
    const res = await request.get(config.routes.list, { maxRedirects: 0 });
    await expectHTMLReadResponse(res, 'data-testid="list-container"');
  });
});
