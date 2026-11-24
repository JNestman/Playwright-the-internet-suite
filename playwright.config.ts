import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

/**
 * Playwright configuration for the the-internet.herokuapp.com test suite.
 * Docs: https://playwright.dev/docs/test-configuration
 *
 * - Chromium runs the full regression suite.
 * - Firefox and WebKit run the tests tagged @smoke for cross-browser coverage.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  // The target is a shared public demo site, so allow a retry to absorb network blips.
  retries: isCI ? 2 : 1,
  // Keep concurrency modest to be a good citizen towards the public demo site.
  workers: isCI ? 2 : 4,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: isCI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.BASE_URL ?? 'https://the-internet.herokuapp.com',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      grep: /@smoke/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      grep: /@smoke/,
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
