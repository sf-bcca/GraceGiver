import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * 
 * Tests run against the Docker test environment (docker-compose.test.yml)
 * App URL: http://localhost:8086
 * API URL: http://localhost:3002
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Run tests sequentially for cleaner state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8086',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Increase timeout for Docker environment
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
});
