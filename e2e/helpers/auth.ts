import type { Page } from '@playwright/test';

/**
 * Log in as a player. Fills the player code input and submits.
 * Waits until the main app UI is visible before resolving.
 */
export async function loginAs(page: Page, playerCode: string): Promise<void> {
  await page.fill('[data-testid="player-code-input"]', playerCode);
  await page.click('[data-testid="login-button"]');
  await page.waitForSelector('[data-testid="mode-toggle"]', { timeout: 10_000 });
}

/**
 * Set valid player_data in localStorage so the app skips the login screen.
 * Use this in tests that are not about auth itself.
 */
export async function skipLoginViaStorage(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem(
      'player_data',
      JSON.stringify({ playerCode: 'TIGER34', loginTime: new Date().toISOString() })
    );
  });
  await page.reload();
  await page.waitForSelector('[data-testid="mode-toggle"]', { timeout: 10_000 });
}
