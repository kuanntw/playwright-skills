import type { APIRequestContext, BrowserContext, Page, Request } from '@playwright/test';

const ALLOWED_METHODS = new Set(['GET', 'HEAD']);

export type ReadOnlyViolation = {
  testTitle: string;
  method: string;
  url: string;
  timestamp: string;
};

// Do not copy credentials, query values or fragments into reports.
function redactedURL(value: string): string {
  try {
    const url = new URL(value);
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return value.split(/[?#]/, 1)[0];
  }
}

function record(violations: ReadOnlyViolation[], testTitle: string, method: string, url: string) {
  violations.push({ testTitle, method, url: redactedURL(url), timestamp: new Date().toISOString() });
}

// Routing is installed on the context BEFORE any page is created. It also
// covers frames and a popup's first navigation, which page.route cannot do.
export async function installReadOnlyNetworkGuard(
  context: BrowserContext,
  violations: ReadOnlyViolation[],
  testTitle: string,
): Promise<{ prepareForClose: () => Promise<void> }> {
  const pending = new Map<Request, { done: Promise<void>; resolve: () => void }>();
  const settle = (request: Request) => {
    pending.get(request)?.resolve();
    pending.delete(request);
  };
  const recorded = new WeakSet<Request>();
  const observe = (request: Request) => {
    const method = request.method().toUpperCase();
    if (!ALLOWED_METHODS.has(method) && !recorded.has(request)) {
      recorded.add(request);
      let resolve!: () => void;
      const done = new Promise<void>((finish) => { resolve = finish; });
      pending.set(request, { done, resolve });
      record(violations, testTitle, method, request.url());
    }
  };
  // Record synchronously at request creation as well: teardown can cancel a
  // pending route callback (notably fire-and-forget beacons/popup navigation).
  context.on('request', observe);
  context.on('requestfailed', settle);
  context.on('requestfinished', settle);
  await context.route('**/*', async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    if (ALLOWED_METHODS.has(method)) {
      await route.continue();
      return;
    }
    observe(request);
    await route.abort('blockedbyclient');
    settle(request);
  });

  // WebSockets are bidirectional, regardless of their GET handshake. Never
  // connectToServer: closing this intercepted socket opens no upstream socket.
  await context.routeWebSocket('**/*', async (socket) => {
    record(violations, testTitle, 'WEBSOCKET', socket.url());
    await socket.close();
  });
  guardAPIRequestContext(context.request, violations, testTitle);
  async function drain() {
    // Do not release paused popup/beacon traffic before its route has aborted.
    while (pending.size) await Promise.all([...pending.values()].map((entry) => entry.done));
  }
  let closed = false;
  context.on('close', () => { closed = true; });
  async function prepareForClose() {
    if (closed) return;
    // Stop late/unload traffic too, not merely the current drain snapshot.
    await context.setOffline(true);
    await drain();
  }

  // Playwright stops invoking route callbacks once close() starts. Protect
  // explicit context closure as well as the fixture's normal teardown.
  const closeContext = context.close.bind(context);
  let closing: Promise<void> | undefined;
  context.close = (options) => {
    closing ??= (async () => {
      await prepareForClose();
      await closeContext(options);
    })();
    return closing;
  };

  // Per-page close cannot take the whole context offline without disrupting
  // other pages. Fail closed instead of silently releasing pending requests.
  // Let fixture/context teardown close pages, including popups.
  const guardPage = (page: Page) => {
    page.close = async () => {
      record(violations, testTitle, 'MANUAL_PAGE_CLOSE', page.url());
      throw new Error('Manual page.close is disabled by the read-only fixture; use context.close or fixture teardown');
    };
  };
  context.on('page', guardPage);
  for (const page of context.pages()) guardPage(page);
  return { prepareForClose };
}

// Browser routes DO NOT intercept APIRequestContext. Guard the instance itself
// so request, context.request and page.request aliases cannot skip this check.
export function guardAPIRequestContext(
  request: APIRequestContext,
  violations: ReadOnlyViolation[],
  testTitle: string,
): void {
  for (const name of ['get', 'head', 'post', 'put', 'patch', 'delete', 'fetch'] as const) {
    const original = request[name].bind(request);
    request[name] = (async (target: string | Request, options?: { method?: string }) => {
      // Convenience methods force their own method. fetch uses a truthy
      // override, then an existing Request's method, then GET.
      const method = (name === 'fetch'
        ? options?.method || (typeof target === 'string' ? 'GET' : target.method())
        : name).toUpperCase();
      if (!ALLOWED_METHODS.has(method)) {
        const url = typeof target === 'string' ? target : target.url();
        record(violations, testTitle, method, url);
        throw new Error(`Blocked ${method} under read-only policy`);
      }
      return original(target as string, options);
    }) as typeof request[typeof name];
  }
}

export function assertNoReadOnlyViolations(violations: ReadOnlyViolation[]) {
  if (violations.length === 0) return;
  const detail = violations.map((v) => `${v.method} ${v.url} (${v.testTitle})`).join('\n');
  throw new Error(`Read-only policy violation(s) detected:\n${detail}`);
}
