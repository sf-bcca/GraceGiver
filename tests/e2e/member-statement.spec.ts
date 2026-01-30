
import { test, expect } from '@playwright/test';
import { login, navigateTo, TEST_MEMBER, waitForApi } from './helpers';

test.describe('Member Statement Generation', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApi(page);
    await login(page);
    await navigateTo(page, 'Members');
    await expect(page.getByRole('heading', { name: /Member Directory/i })).toBeVisible();
  });

  test('should open statement modal and allow PDF download', async ({ page }) => {
    // 1. Find the test member row
    // 1. Find the test member row - use ID to be specific and avoid strict mode issues with duplicates
    const row = page.getByRole('row', { name: TEST_MEMBER.lastName }).filter({ hasText: TEST_MEMBER.id });
    await expect(row).toBeVisible();

    // 2. Click the "Statement" button
    const statementButton = row.getByTestId('annual-statement-button');
    await expect(statementButton).toBeVisible();
    await statementButton.click({ force: true });

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
