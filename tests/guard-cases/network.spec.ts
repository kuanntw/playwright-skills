import { test, expect } from '../../skills/readonly-core/fixtures/readOnlyFixture';
import { capturePagePerf } from '../../skills/readonly-core/reporters/perfMetrics';

// Intentionally failing tests below are checked by scripts/test-readonly-guard.mjs.
// Do not run this file as a passing suite or mark these tests expected failures:
// the harness verifies the exact teardown error AND zero writes at the server.
async function bodyCompleted(testInfo: import('@playwright/test').TestInfo) {
  await testInfo.attach('body-completed', { body: 'true', contentType: 'text/plain' });
}

test('allowed: GET HEAD redirects performance and aliases', async ({ page, request, context }, testInfo) => {
  await page.goto('/');
  expect((await request.get('/items')).status()).toBe(200);
  expect((await request.head('/items')).status()).toBe(200);
  expect((await context.request.get('/items')).status()).toBe(200);
  expect((await page.request.head('/items')).status()).toBe(200);
  expect((await request.fetch('/items', { method: 'get' })).status()).toBe(200);
  await page.goto('/redirect');
  expect(page.url()).toMatch(/\/items$/);
  const metric = await capturePagePerf(page, testInfo, page.url());
  expect(metric.ttfbMs).toBeGreaterThanOrEqual(0);
  expect(metric.overallRenderMs).toBeGreaterThanOrEqual(0);
  await bodyCompleted(testInfo);
});

test('allowed: Service Worker cannot register or fetch its script', async ({ page, context }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
  await page.waitForTimeout(100);
  expect(context.serviceWorkers()).toHaveLength(0);
  expect(await page.evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length))).toBe(0);
  await bodyCompleted(testInfo);
});

for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
  test(`blocked: browser ${method}`, async ({ page }, testInfo) => {
    await page.goto('/');
    await page.evaluate(async (method) => {
      await fetch('/write?secret=do-not-report', { method }).catch(() => {});
    }, method);
    await bodyCompleted(testInfo);
  });
}

test('blocked: form popup initial POST', async ({ page }, testInfo) => {
  await page.goto('/');
  const requestSeen = page.context().waitForEvent('request', (request) => request.method() === 'POST');
  await page.evaluate(() => {
    const form = document.createElement('form');
    form.action = '/popup-write'; form.method = 'post'; form.target = '_blank';
    document.body.append(form); form.submit();
  });
  await requestSeen;
  await bodyCompleted(testInfo);
});

test('blocked: popup fetch', async ({ page }, testInfo) => {
  await page.goto('/');
  const opened = page.waitForEvent('popup');
  await page.evaluate(() => window.open('/items'));
  const popup = await opened;
  await popup.waitForLoadState();
  await popup.evaluate(() => fetch('/popup-write', { method: 'POST' }).catch(() => {}));
  await bodyCompleted(testInfo);
});

test('blocked: frame fetch', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.setContent('<iframe src="/items"></iframe>');
  const frame = page.frames()[1];
  await frame.waitForLoadState();
  await frame.evaluate(() => fetch('/frame-write', { method: 'POST' }).catch(() => {}));
  await bodyCompleted(testInfo);
});

for (const method of ['post', 'put', 'patch', 'delete'] as const) {
  test(`blocked: API ${method}`, async ({ request }, testInfo) => {
    await expect(request[method]('/api-write')).rejects.toThrow('Blocked');
    await bodyCompleted(testInfo);
  });
}

test('blocked: API fetch mixed-case method', async ({ request }, testInfo) => {
  await expect(request.fetch('/api-write', { method: 'pOsT' })).rejects.toThrow('Blocked');
  await bodyCompleted(testInfo);
});

test('blocked: API convenience method cannot be disguised', async ({ request }, testInfo) => {
  await expect(request.post('/api-write', { method: 'GET' } as never)).rejects.toThrow('Blocked');
  await bodyCompleted(testInfo);
});

for (const alias of ['context', 'page', 'page.context', 'popup'] as const) {
  test(`blocked: API ${alias} alias`, async ({ context, page }, testInfo) => {
    await page.goto('/');
    let api = alias === 'context' ? context.request : alias === 'page.context' ? page.context().request : page.request;
    if (alias === 'popup') {
      const opened = page.waitForEvent('popup');
      await page.evaluate(() => window.open('/items'));
      api = (await opened).request;
    }
    await expect(api.post('/alias-write')).rejects.toThrow('Blocked');
    await bodyCompleted(testInfo);
  });
}

test('blocked: API fetch Request input with empty method override', async ({ page, request }, testInfo) => {
  await page.goto('/');
  const seen = page.waitForRequest((req) => req.method() === 'POST');
  await page.evaluate(() => fetch('/request-input-write', { method: 'POST' }).catch(() => {}));
  await expect(request.fetch(await seen, { method: '' })).rejects.toThrow('Blocked');
  await bodyCompleted(testInfo);
});

test('blocked: WebSocket never connects upstream', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => new Promise<void>((resolve) => {
    const socket = new WebSocket(location.origin.replace('http', 'ws') + '/socket');
    socket.onclose = () => resolve(); socket.onerror = () => resolve();
  }));
  await bodyCompleted(testInfo);
});

test('blocked: beacon', async ({ page }, testInfo) => {
  await page.goto('/');
  const requestSeen = page.waitForRequest((req) => req.method() === 'POST');
  await page.evaluate(() => navigator.sendBeacon('/beacon-write', 'sample'));
  await requestSeen;
  await bodyCompleted(testInfo);
});


test('blocked: XHR', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => new Promise<void>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/xhr-write'); xhr.onloadend = () => resolve(); xhr.send('sample');
  }));
  await bodyCompleted(testInfo);
});

test('blocked: another context page', async ({ context }, testInfo) => {
  const page = await context.newPage();
  await page.goto('/');
  await page.evaluate(() => fetch('/second-page-write', { method: 'POST' }).catch(() => {}));
  await bodyCompleted(testInfo);
});

test('blocked: API fetch overrides a GET Request', async ({ page, request }, testInfo) => {
  const seen = page.waitForRequest((req) => req.method() === 'GET');
  await page.goto('/');
  await expect(request.fetch(await seen, { method: 'POST' })).rejects.toThrow('Blocked');
  await bodyCompleted(testInfo);
});


test('blocked: unload beacon during navigation', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.addEventListener('pagehide', () => navigator.sendBeacon('/unload-write', 'sample'));
  });
  const seen = page.waitForRequest((req) => req.url().endsWith('/unload-write'));
  await page.goto('/items');
  await seen;
  await bodyCompleted(testInfo);
});

const cleanupTest = test.extend<{ lateWrite: void }>({
  lateWrite: [async ({ page }, use) => {
    await use();
    await page.evaluate(() => navigator.sendBeacon('/cleanup-write', 'sample'));
  }, { auto: true }],
});
cleanupTest('blocked: fixture cleanup beacon', async ({ page }, testInfo) => {
  await page.goto('/');
  await bodyCompleted(testInfo);
});

test('conditional: shutdown timer is cancelled or blocked', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => {
    // These callbacks may never run after the context closes. If they do run,
    // the teardown offline barrier must prevent traffic from escaping.
    window.addEventListener('pagehide', () => navigator.sendBeacon('/close-write', 'sample'));
    setTimeout(() => navigator.sendBeacon('/late-timer-write', 'sample'), 100);
  });
  await bodyCompleted(testInfo);
});

for (const target of ['page', 'context'] as const) {
  test(`blocked: rapid POST then ${target}.close`, async ({ page, context }, testInfo) => {
    await page.goto('/');
    await page.evaluate(() => { void fetch('/manual-close-write', { method: 'POST' }).catch(() => {}); });
    if (target === 'page') await expect(page.close()).rejects.toThrow('Manual page.close');
    else await context.close();
    await bodyCompleted(testInfo);
  });
}
