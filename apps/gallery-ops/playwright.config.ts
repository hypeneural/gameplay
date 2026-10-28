import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  timeout: 30_000,
  reporter: 'list',
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
  ],
  use: {
    baseURL: 'http://127.0.0.1:4178/gestao/galerias/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm --filter @christmas-games/gallery-ops dev',
    url: 'http://127.0.0.1:4178/gestao/galerias/',
    reuseExistingServer: false,
    timeout: 45_000,
  },
});
