import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  timeout: 60_000,
  fullyParallel: false,
  use: {
    browserName: 'firefox',
    headless: true,
    baseURL: process.env.TPL_TEST_FRONTEND_URL ?? 'http://localhost:5173',
  },
  reporter: [['line']],
});
