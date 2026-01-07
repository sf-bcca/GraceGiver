/**
 * Login Flow E2E Tests
 * 
 * Tests the authentication flow: login, session persistence, and logout.
 */

import { test, expect } from '@playwright/test';
import { login, logout, clearAuth, TEST_USER, waitForApi, API_URL } from './helpers';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for API to be ready before each test
    await waitForApi(page);
    // Clear any existing auth state
    await page.goto('/');
    await clearAuth(page);
    await page.reload();
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/');
    
    // Should show login form with "Welcome Back" heading
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.locator('[data-testid="username-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/');
    
    // Fill login form using data-testid
    await page.locator('[data-testid="username-input"]').fill(TEST_USER.username);
    await page.locator('[data-testid="password-input"]').fill(TEST_USER.password);
    
    // Submit
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should navigate to dashboard - look for the Financial Dashboard heading
    await expect(page.getByRole('heading', { name: /financial dashboard/i })).toBeVisible({ timeout: 15000 });
    
    // Token should be stored
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });

  test('should show error for invalid username', async ({ page }) => {
    await page.goto('/');
    
    await page.locator('[data-testid="username-input"]').fill('nonexistent_user');
    await page.locator('[data-testid="password-input"]').fill('anypassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show error message
    await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show error for invalid password', async ({ page }) => {
    await page.goto('/');
    
    await page.locator('[data-testid="username-input"]').fill(TEST_USER.username);
    await page.locator('[data-testid="password-input"]').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show error message
    await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible({ timeout: 10000 });
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await login(page);
    
    // Find and click logout
    await logout(page);
    
    // Should return to login page  
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 10000 });
    
    // Token should be cleared
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeFalsy();
  });

  test('should persist session on page reload', async ({ page }) => {
    // Login first
    await login(page);
    
    // Reload the page
    await page.reload();
    
    // Should still be on dashboard (not redirected to login)
    await expect(page.getByRole('heading', { name: /financial dashboard/i })).toBeVisible({ timeout: 15000 });
  });
});
