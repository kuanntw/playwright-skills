import { test as base } from '@playwright/test';
import { installReadOnlyNetworkGuard, ReadOnlyViolation } from '../guards/networkGuard';

type ReadOnlyFixtures = {
  readOnlyViolations: ReadOnlyViolation[];
};

export const test = base.extend<ReadOnlyFixtures>({
  readOnlyViolations: async ({ page }, use, testInfo) => {
    const violations = installReadOnlyNetworkGuard(page, testInfo.title);
    await use(violations);
  },
});

export { expect } from '@playwright/test';
