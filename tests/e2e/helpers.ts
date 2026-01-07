/**
 * E2E Test Utilities and Fixtures
 * 
 * Shared helpers for Playwright E2E tests.
 */

import { Page, expect } from '@playwright/test';

// Test environment configuration
export const TEST_URL = process.env.E2E_BASE_URL || 'http://localhost:8086';
export const API_URL = process.env.E2E_API_URL || 'http://localhost:3002';

// Test user credentials (from db/seed-test-users.sql)
export const TEST_USER = {
  username: 'testuser_a',
  password: 'TestPass123!',
  role: 'admin'
};

// Pre-seeded test data
export const TEST_MEMBER = {
  id: 'test-member-001',
  firstName: 'Lock',
  lastName: 'TestMember'
};

/**
 * Login helper - performs login and waits for dashboard
 */
export async function login(page: Page, username = TEST_USER.username, password = TEST_USER.password) {
  await page.goto('/');
  
  // Wait for login page to load - heading is "Welcome Back"
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 15000 });
  
  // Fill credentials using data-testid attributes
  await page.locator('[data-testid="username-input"]').fill(username);
  await page.locator('[data-testid="password-input"]').fill(password);
  
  // Submit login - button text is "Sign In"
  await page.getByRole('button', { name: /sign in/i }).click();
  
  // Wait for dashboard to load (indicates successful login - Financial Dashboard heading)
  await expect(page.getByRole('heading', { name: /financial dashboard/i })).toBeVisible({ timeout: 15000 });
}

/**
 * Logout helper
 */
export async function logout(page: Page) {
  // Look for logout button in navigation/header
  const logoutButton = page.getByRole('button', { name: /log ?out/i });
  
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    // Wait for login page to appear - "Welcome Back" heading
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 10000 });
  }
}

/**
 * Navigate to a specific view via sidebar/navigation
 */
export async function navigateTo(page: Page, viewName: 'Dashboard' | 'Members' | 'Entry' | 'Reports' | 'Settings') {
  const navButton = page.getByRole('button', { name: new RegExp(viewName, 'i') });
  await navButton.click();
  
  // Wait for view to load
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for API to be ready
 */
export async function waitForApi(page: Page, maxWaitMs = 30000) {
  const start = Date.now();
  
  while (Date.now() - start < maxWaitMs) {
    try {
      const response = await page.request.get(`${API_URL}/api/auth/password-policy`);
      if (response.ok()) {
        return true;
      }
    } catch (e) {
      // API not ready yet
    }
    await page.waitForTimeout(500);
  }
  
  throw new Error(`API not ready after ${maxWaitMs}ms`);
}

/**
 * Clear local storage (for clean test state)
 */
export async function clearAuth(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  });
}
