import { test as base } from '@playwright/test';
import {
  assertNoReadOnlyViolations, guardAPIRequestContext, installReadOnlyNetworkGuard,
  type ReadOnlyViolation,
} from '../guards/networkGuard';

type ReadOnlyFixtures = { readOnlyViolations: ReadOnlyViolation[] };

export const test = base.extend<ReadOnlyFixtures>({
  serviceWorkers: 'block',

  // This collector is automatic, including tests that only request API fixtures.
  // Dependent context/request fixtures finish teardown BEFORE this assertion.
  readOnlyViolations: [async ({}, use, testInfo) => {
    const violations: ReadOnlyViolation[] = [];
    try {
      await use(violations);
    } finally {
      if (violations.length) {
        await testInfo.attach('readonly-violations', {
          body: JSON.stringify(violations, null, 2), contentType: 'application/json',
        });
      }
      assertNoReadOnlyViolations(violations);
    }
  }, { auto: true }],

  context: async ({ context, serviceWorkers, readOnlyViolations }, use, testInfo) => {
    if (serviceWorkers !== 'block') {
      throw new Error('Read-only tests require serviceWorkers: "block"');
    }
    const guard = await installReadOnlyNetworkGuard(context, readOnlyViolations, testInfo.title);
    try {
      await use(context);
    } finally {
      await guard.prepareForClose();
    }
    // Keep guards installed through Playwright's built-in context teardown.
  },

  request: async ({ request, readOnlyViolations }, use, testInfo) => {
    guardAPIRequestContext(request, readOnlyViolations, testInfo.title);
    await use(request);
  },
});

export { expect } from '@playwright/test';
