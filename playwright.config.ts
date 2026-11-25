import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: {
    baseURL: 'http://localhost:4173/retirement-planner/',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Locally, PW_CHANNEL=msedge (or chrome) uses an installed browser instead of Playwright's.
        ...(process.env.PW_CHANNEL && { channel: process.env.PW_CHANNEL }),
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/retirement-planner/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
