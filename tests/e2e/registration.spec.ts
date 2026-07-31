import { test, expect } from '@playwright/test';
import { clearAuth } from './helpers';

test.describe('Member Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearAuth(page);
    await page.reload();
  });

  test('should navigate to registration page from login', async ({ page }) => {
    await page.getByRole('button', { name: /new here\? join/i }).click();
    await expect(page.getByRole('heading', { name: /join gracegiver/i })).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.getByRole('button', { name: /new here\? join/i }).click();
    await page.getByRole('button', { name: /create account/i }).click();
    
    // Check if any "Required" text appears (from our custom validation)
    await expect(page.getByText(/required/i).first()).toBeVisible();
  });

  test('should successfully register a new member', async ({ page }) => {
    const randomEmail = `test-${Date.now()}@example.com`;
    
    await page.getByRole('button', { name: /new here\? join/i }).click();
    
    await page.getByLabel(/first name/i).fill('Test');
    await page.getByLabel(/last name/i).fill('User');
    await page.getByLabel(/email address/i).fill(randomEmail);
    await page.locator('input[type="password"]').first().fill('SecurePass123!abcd');
    await page.locator('input[type="password"]').last().fill('SecurePass123!abcd');
    
    // Submit registration
    await page.getByRole('button', { name: /create account/i }).click();
    
    // Should be redirected to Member Portal
    await expect(page.getByText(/member portal/i).or(page.getByRole('heading', { name: /welcome/i })).first()).toBeVisible({ timeout: 15000 });
  });

  test('should match existing member by email', async ({ page }) => {
    await page.getByRole('button', { name: /new here\? join/i }).click();
    await page.getByLabel(/first name/i).fill('Lock');
    await page.getByLabel(/last name/i).fill('TestMember');
    await page.getByLabel(/email address/i).fill('viewertest@example.com');
    await page.locator('input[type="password"]').first().fill('SecurePass123!abcd');
    await page.locator('input[type="password"]').last().fill('SecurePass123!abcd');
    
    await page.getByRole('button', { name: /create account/i }).click();
    
    // Check for either success or the specific "already registered" error
    const error = page.getByText(/account with this email/i).or(page.getByText(/already exists/i));
    const dashboard = page.getByText(/member portal/i).or(page.getByRole('heading', { name: /welcome/i })).first();
    
    await expect(error.or(dashboard)).toBeVisible({ timeout: 15000 });
  });
});
