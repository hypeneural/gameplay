import { defineConfig, devices } from '@playwright/test';

const e2ePort = Number(process.env.CG_E2E_PORT ?? 4173);
if (!Number.isInteger(e2ePort) || e2ePort < 1 || e2ePort > 65_535) {
  throw new Error('CG_E2E_PORT must be a valid TCP port.');
}
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;
const e2eOutputDir = process.env.CG_E2E_OUTPUT_DIR ?? 'test-results';
const e2eHtmlReportDir = process.env.CG_E2E_HTML_REPORT_DIR ?? 'playwright-report';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  workers: 1,
  expect: { timeout: 10_000 },
  outputDir: e2eOutputDir,
  reporter: [['list'], ['html', { open: 'never', outputFolder: e2eHtmlReportDir }]],
  use: {
    baseURL: e2eBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'iphone-390',
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'android-412',
      use: { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true },
    },
    {
      name: 'large-phone-430',
      use: { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true },
    },
    {
      name: 'tablet-768',
      use: {
        ...devices['iPad (gen 7)'],
        browserName: 'chromium',
        viewport: { width: 768, height: 1024 },
      },
    },
  ],
  webServer: {
    command: `pnpm --filter @christmas-games/play dev --host 127.0.0.1 --port ${e2ePort}`,
    url: e2eBaseUrl,
    reuseExistingServer: !process.env.CI,
  },
});
