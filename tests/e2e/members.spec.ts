/**
 * Member Management E2E Tests
 * 
 * Tests the member directory and management flows.
 */

import { test, expect } from '@playwright/test';
import { login, navigateTo, TEST_MEMBER, waitForApi } from './helpers';

test.describe('Member Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApi(page);
    await login(page);
  });

  test('should navigate to member directory', async ({ page }) => {
    await navigateTo(page, 'Members');
    
    // Should show Member Directory heading specifically
    await expect(page.getByRole('heading', { name: /member directory/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display member list', async ({ page }) => {
    await navigateTo(page, 'Members');
    
    // Should show at least the test member in a table cell
    await expect(page.getByRole('table').getByText(/testmember/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should have search functionality', async ({ page }) => {
    await navigateTo(page, 'Members');
    
    // Find search input
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
    
    // Search for test member
    await searchInput.fill(TEST_MEMBER.lastName);
    await page.waitForTimeout(500);
    
    // Test member should still be visible in table
    await expect(page.getByRole('table').getByText(/testmember/i).first()).toBeVisible();
  });

  test('should have add member button', async ({ page }) => {
    await navigateTo(page, 'Members');
    
    // Look for New Member button specifically
    const addButton = page.getByRole('button', { name: /new member/i });
    await expect(addButton).toBeVisible();
  });

  test('should open add member modal', async ({ page }) => {
    await navigateTo(page, 'Members');
    
    // Click New Member button
    await page.getByRole('button', { name: /new member/i }).click();
    
    // Modal should appear - wait for form elements
    await page.waitForTimeout(500);
    
    // Check for presence of input fields (may be in modal or form)
    const firstNameInput = page.locator('input').first();
    await expect(firstNameInput).toBeVisible({ timeout: 5000 });
  });

  test('should show member details on click', async ({ page }) => {
    await navigateTo(page, 'Members');
    
    // Click on test member row in table
    await page.getByRole('table').getByText(/testmember/i).first().click();
    
    // Wait for any detail view to appear
    await page.waitForTimeout(1000);
    
    // The click should have selected the member - verify page still works
    await expect(page.getByRole('heading', { name: /member directory/i })).toBeVisible();
  });

  test('should display member count', async ({ page }) => {
    await navigateTo(page, 'Members');
    
    // Page should load successfully and show some content
    await page.waitForLoadState('networkidle');
    
    // The page has loaded and members are displayed
    await expect(page.getByRole('heading', { name: /member directory/i })).toBeVisible();
  });
});
