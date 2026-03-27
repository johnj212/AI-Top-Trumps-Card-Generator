import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  snapshotDir: './e2e/screenshots',
  timeout: 30_000,
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  use: {
    baseURL: 'http://localhost:8088',
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 900 },
  },
  webServer: [
    {
      command: 'npm run dev:server',
      port: 3001,
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev:client',
      port: 8088,
      reuseExistingServer: true,
    },
  ],
});
