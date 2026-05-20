import { test, expect } from '@playwright/test';

test.describe('Asset Printing Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="Enter your username"]', 'admin');
    await page.fill('input[placeholder="••••••••"]', 'admin');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard then go to assets
    await page.waitForURL('**/dashboard');
    await page.goto('/assets');
  });

  test('should open print modal without navigating away from /assets', async ({ page }) => {
    // 1. Wait for the asset list to load
    await page.waitForSelector('table');

    // 2. Click the '...' menu of the first asset
    const firstRowActions = page.locator('table tbody tr').first().locator('button').last();
    await firstRowActions.click();

    // 3. Click 'In tem tài sản'
    const printOption = page.locator('text=In tem tài sản');
    await printOption.click();

    // 4. Verify the modal is visible
    const modalTitle = page.locator('h3:has-text("In tem tài sản")');
    await expect(modalTitle).toBeVisible();

    // 5. Verify the URL hasn't changed to /print-center
    expect(page.url()).toContain('/assets');
    expect(page.url()).not.toContain('/print-center');

    // 6. Close the modal
    await page.locator('button:has-text("Đóng lại")').click();
    await expect(modalTitle).not.toBeVisible();
  });

  test('should trigger print modal from asset detail popup', async ({ page }) => {
    // 1. Wait for table then click on an asset name (button)
    await page.waitForSelector('table');
    const firstAssetButton = page.locator('table tbody tr').first().locator('td').nth(1).locator('button');
    await firstAssetButton.click();

    // 2. Wait for popup to open
    await page.waitForSelector('h2:has-text("Chi tiết tài sản")');

    // 3. Click 'In tem' in the header
    const printButton = page.locator('button:has-text("In tem")').first();
    await printButton.click();

    // 4. Verify print modal opens on top
    await expect(page.locator('h3:has-text("In tem tài sản")')).toBeVisible();
  });
});
