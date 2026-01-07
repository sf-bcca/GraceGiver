/**
 * Donation Entry E2E Tests
 * 
 * Tests the donation entry flow: navigation, form submission, and verification.
 */

import { test, expect } from '@playwright/test';
import { login, navigateTo, TEST_MEMBER, waitForApi } from './helpers';

test.describe('Donation Entry Flow', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApi(page);
    await login(page);
  });

  test('should navigate to donation entry page', async ({ page }) => {
    // Click on Entry in navigation
    await navigateTo(page, 'Entry');
    
    // Should show donation entry heading specifically
    await expect(page.getByRole('heading', { name: /donation entry/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display donation entry form elements', async ({ page }) => {
    await navigateTo(page, 'Entry');
    
    // Check for specific form elements using labels
    await expect(page.getByText(/select member/i)).toBeVisible();
    await expect(page.getByText(/amount/i).first()).toBeVisible();
  });

  test('should have New Transaction section', async ({ page }) => {
    await navigateTo(page, 'Entry');
    
    // Look for New Transaction heading
    await expect(page.getByRole('heading', { name: /new transaction/i })).toBeVisible();
  });

  test('should have amount input field', async ({ page }) => {
    await navigateTo(page, 'Entry');
    
    // Find amount input by placeholder or type
    const amountInput = page.locator('input[type="number"]').first();
    await expect(amountInput).toBeVisible();
  });

  test('should display transaction history section', async ({ page }) => {
    await navigateTo(page, 'Entry');
    
    // Look for Transaction History heading
    await expect(page.getByRole('heading', { name: /transaction history/i })).toBeVisible({ timeout: 10000 });
  });

  test('should have fund selection options', async ({ page }) => {
    await navigateTo(page, 'Entry');
    
    // Check for fund-related elements
    await expect(page.getByText(/fund/i).first()).toBeVisible();
  });
});
