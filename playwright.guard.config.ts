import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/guard-cases',
  workers: 1,
  retries: 0,
  timeout: 15_000,
  reporter: [['json', { outputFile: 'artifacts/guard-results.json' }]],
  outputDir: 'artifacts/guard-output',
  use: {
    baseURL: process.env.READONLY_GUARD_BASE_URL,
    serviceWorkers: 'block',
  },
});
