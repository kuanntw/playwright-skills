import { defineConfig } from '@playwright/test';

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
  use: {
    trace: 'on',
    video: 'on',
    screenshot: 'only-on-failure'
  }
});
