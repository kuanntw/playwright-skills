import { defineConfig } from '@playwright/test';
import { config } from './skills/readonly-adapters/template/config';

export default defineConfig({
  testDir: './tests/readonly',
  workers: 3,
  fullyParallel: true,
  timeout: 60_000,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'artifacts/readonly-report' }],
    ['json', { outputFile: 'artifacts/readonly-report/results.json' }]
  ],
  outputDir: 'artifacts/readonly-output',
  globalSetup: './scripts/check-readonly-imports.mjs',
  use: {
    baseURL: config.baseURL,
    serviceWorkers: 'block',
    trace: 'on',
    video: 'on',
    screenshot: 'only-on-failure'
  }
});
