
import { test, expect } from '@playwright/test';
import { login, navigateTo, TEST_MEMBER, waitForApi } from './helpers';

test.describe('Member Statement Generation', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApi(page);
    await login(page);
    await navigateTo(page, 'Members');
  });

  test('should open statement modal and allow PDF download', async ({ page }) => {
    // 1. Find the test member row
    const row = page.getByRole('row', { name: TEST_MEMBER.lastName });
    await expect(row).toBeVisible();

    // 2. Click the "Statement" button (we'll need to add this button)
    // We'll assume a new button with title "Annual Statement" or icon
    // For now, let's target by title attribute or aria-label if we add it
    const statementButton = row.getByRole('button', { name: /statement/i });
    
    // Check if it exists (it won't yet)
    // If we use standard TDD, this test should fail here.
    // However, if the button is hidden/in menu, we might need to click 'More' first.
    // In MemberDirectory, actions are visible in the row.
    
    await statementButton.click();

    // 3. Verify Modal opens
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByText(/Annual Contribution Statement/i)).toBeVisible();

    // 4. Check Year Selection
    const yearSelect = modal.getByLabel(/Tax Year/i);
    await expect(yearSelect).toBeVisible();
    // Default should be current year or previous
    const currentYear = new Date().getFullYear().toString();
    await expect(yearSelect).toHaveValue(currentYear);

    // 5. Check Preview (Narrative)
    // It might take a moment to load
    await expect(modal.getByText(/Impact Summary/i)).toBeVisible({ timeout: 5000 });

    // 6. Trigger Download (We can't easily verify file content in E2E without complex setup, 
    // but we can verify the download event or button state)
    
    // Start waiting for download before clicking. Note: Download requires actual browser context.
    const downloadPromise = page.waitForEvent('download');
    await modal.getByRole('button', { name: /Download PDF/i }).click();
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('.pdf');
  });
});
