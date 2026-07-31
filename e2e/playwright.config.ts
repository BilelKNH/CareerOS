import { defineConfig, devices } from '@playwright/test';

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000';
const API_URL = process.env.API_URL ?? 'http://localhost:3001';

// When E2E_MANAGE_SERVERS=1, Playwright boots the API and web itself.
// Otherwise it assumes they are already running (e.g. `pnpm dev`).
const manageServers = process.env.E2E_MANAGE_SERVERS === '1';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'api', testMatch: /.*\.api\.spec\.ts/ },
    {
      name: 'ui',
      testMatch: /.*\.ui\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: manageServers
    ? [
        {
          command: 'pnpm --filter @careeros/api dev',
          url: `${API_URL}/api/health`,
          timeout: 120000,
          reuseExistingServer: !process.env.CI,
          cwd: '..',
        },
        {
          command: 'pnpm --filter @careeros/web dev',
          url: WEB_URL,
          timeout: 120000,
          reuseExistingServer: !process.env.CI,
          cwd: '..',
        },
      ]
    : undefined,
});
