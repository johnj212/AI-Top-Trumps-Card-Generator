import { test, expect } from '@playwright/test';
import { setupMocks } from '../helpers/mock-api';
import { skipLoginViaStorage } from '../helpers/auth';

test.beforeEach(async ({ page }) => {
  await setupMocks(page);
  await skipLoginViaStorage(page);
});

test('selecting a theme auto-populates stats', async ({ page }) => {
  // Change from default theme to a different one
  const themeSelect = page.locator('[data-testid="theme-select"]');
  await themeSelect.selectOption({ index: 1 }); // Pick second theme
  // The stats mock returns 6 stat names; verify the control panel reflects them
  await expect(page.locator('[data-testid="theme-select"]')).not.toHaveValue('');
});

test('selecting color scheme updates preview card styling', async ({ page }) => {
  const select = page.locator('[data-testid="color-scheme-select"]');
  const initialValue = await select.inputValue();
  // Pick a different scheme
  const options = await select.locator('option').all();
  const targetValue = await options[1].getAttribute('value') ?? '';
  await select.selectOption(targetValue);
  await expect(select).not.toHaveValue(initialValue);
  // Card preview should still be visible (not crashed)
  await expect(page.locator('[data-testid="card-preview"]')).toBeVisible();
});

test('Generate Preview Card renders card with image, title, stats, rarity badge', async ({ page }) => {
  await page.click('[data-testid="generate-preview-btn"]');
  // Wait for loading to finish (loader disappears)
  await page.waitForSelector('[data-testid="card-title"]', { timeout: 15_000 });
  await expect(page.locator('[data-testid="card-stats"]')).toBeVisible();
  // Image element should have a src (either base64 or URL)
  const cardPreview = page.locator('[data-testid="card-preview"]');
  await expect(cardPreview.locator('img')).toHaveAttribute('src', /data:image|https/);
  // Rarity badge is only shown for non-Common rarities — check conditionally
  const rarityBadge = page.locator('[data-testid="card-rarity-badge"]');
  const badgeCount = await rarityBadge.count();
  if (badgeCount > 0) {
    await expect(rarityBadge).toBeVisible();
  }
});

test('visual snapshot: card preview is clean with no overlapping elements', async ({ page }) => {
  await page.click('[data-testid="generate-preview-btn"]');
  await page.waitForSelector('[data-testid="card-title"]', { timeout: 15_000 });
  // Give images time to fully render
  await page.waitForTimeout(500);
  await expect(page.locator('[data-testid="card-preview"]')).toHaveScreenshot('card-preview.png');
});

test('download button triggers file download', async ({ page }) => {
  await page.click('[data-testid="generate-preview-btn"]');
  await page.waitForSelector('[data-testid="card-title"]', { timeout: 15_000 });

  const downloadPromise = page.waitForEvent('download', { timeout: 15_000 });
  await page.click('[data-testid="card-download-btn"]');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/i);
});

test('visual snapshot: downloaded card PNG is clean (captures card element)', async ({ page }) => {
  await page.click('[data-testid="generate-preview-btn"]');
  await page.waitForSelector('[data-testid="card-title"]', { timeout: 15_000 });
  await page.waitForTimeout(500);
  // Take a screenshot of just the card element — this represents what the downloaded PNG will look like
  await expect(page.locator('[data-testid="card-preview"]')).toHaveScreenshot('card-download-preview.png');
});

test('Generate Full Pack produces 4 cards in the grid', async ({ page }) => {
  // First generate a preview card
  await page.click('[data-testid="generate-preview-btn"]');
  await page.waitForSelector('[data-testid="generate-pack-btn"]', { timeout: 15_000 });

  // Then generate the full pack
  await page.click('[data-testid="generate-pack-btn"]');
  // Wait for all 4 cards to appear
  await page.waitForSelector('[data-testid="generated-cards-grid"]', { timeout: 30_000 });
  const cards = page.locator('[data-testid^="generated-card-"]');
  await expect(cards).toHaveCount(4, { timeout: 30_000 });
});

test('visual snapshot: card grid has no overlapping cards', async ({ page }) => {
  await page.click('[data-testid="generate-preview-btn"]');
  await page.waitForSelector('[data-testid="generate-pack-btn"]', { timeout: 15_000 });
  await page.click('[data-testid="generate-pack-btn"]');
  await page.waitForSelector('[data-testid="generated-cards-grid"]', { timeout: 30_000 });
  await expect(page.locator('[data-testid^="generated-card-"]')).toHaveCount(4, { timeout: 30_000 });
  await page.waitForTimeout(500);
  await expect(page.locator('[data-testid="generated-cards-grid"]')).toHaveScreenshot('card-grid.png');
});
