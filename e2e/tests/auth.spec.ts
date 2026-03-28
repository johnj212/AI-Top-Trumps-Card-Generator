import { test, expect } from '@playwright/test';
import { setupMocks } from '../helpers/mock-api';

test.beforeEach(async ({ page }) => {
  await setupMocks(page);
  // Clear auth state before each test
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('valid player code logs in and shows main app', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="player-code-input"]', 'TIGER34');
  await page.click('[data-testid="login-button"]');
  await expect(page.locator('[data-testid="mode-toggle"]')).toBeVisible();
});

test('invalid player code shows error message', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="player-code-input"]', 'WRONGCODE');
  await page.click('[data-testid="login-button"]');
  await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
  // Should remain on login screen
  await expect(page.locator('[data-testid="player-code-input"]')).toBeVisible();
});

test('page refresh with valid session stays logged in', async ({ page }) => {
  // Simulate a pre-existing session via localStorage
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem(
      'player_data',
      JSON.stringify({ playerCode: 'TIGER34', loginTime: new Date().toISOString() })
    );
  });
  await page.reload();
  // Validate endpoint is mocked to return valid — app should skip login
  await expect(page.locator('[data-testid="mode-toggle"]')).toBeVisible({ timeout: 10_000 });
});

test('logout returns to login screen', async ({ page }) => {
  // Log in first
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem(
      'player_data',
      JSON.stringify({ playerCode: 'TIGER34', loginTime: new Date().toISOString() })
    );
  });
  await page.reload();
  await page.waitForSelector('[data-testid="mode-toggle"]');

  // Click logout — PlayerProfile renders a logout button
  await page.click('[data-testid="logout-btn"]');
  await expect(page.locator('[data-testid="player-code-input"]')).toBeVisible({ timeout: 10_000 });
});
