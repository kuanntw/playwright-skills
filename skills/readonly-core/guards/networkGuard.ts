import type { Page } from '@playwright/test';

const ALLOWED_METHODS = new Set(['GET', 'HEAD']);

export type ReadOnlyViolation = {
  testTitle: string;
  method: string;
  url: string;
  timestamp: string;
};

export function installReadOnlyNetworkGuard(page: Page, testTitle: string): ReadOnlyViolation[] {
  const violations: ReadOnlyViolation[] = [];

  page.on('request', (req) => {
    const method = req.method().toUpperCase();
    if (!ALLOWED_METHODS.has(method)) {
      violations.push({
        testTitle,
        method,
        url: req.url(),
        timestamp: new Date().toISOString(),
      });
    }
  });

  return violations;
}

export function assertNoReadOnlyViolations(violations: ReadOnlyViolation[]) {
  if (violations.length === 0) return;

  const detail = violations
    .map((v) => `${v.method} ${v.url} (${v.testTitle})`)
    .join('\n');

  throw new Error(`Read-only policy violation(s) detected:\n${detail}`);
}
