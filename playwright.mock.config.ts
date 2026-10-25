import { defineConfig } from '@playwright/test';
import readonlyConfig from './playwright.readonly.config';

export default defineConfig(readonlyConfig, {
  use: { baseURL: 'http://127.0.0.1:4177' },
  webServer: {
    command: 'node tests/support/mockServer.mjs',
    url: 'http://127.0.0.1:4177',
    reuseExistingServer: false,
  },
});
