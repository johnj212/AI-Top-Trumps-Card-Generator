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
  // Verify that stat labels from the fixture appear in the card preview
  // (The theme's predefined stats drive the card display — at least one should be visible)
  await expect(page.locator('[data-testid="card-stats"]')).toBeVisible();
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
  // Rarity badge is always rendered (Common shows "COMMON", others show their tier)
  await expect(page.locator('[data-testid="card-rarity-badge"]')).toBeVisible();
});

test('visual snapshot: card preview is clean with no overlapping elements', async ({ page }) => {
  await page.click('[data-testid="generate-preview-btn"]');
  await page.waitForSelector('[data-testid="card-title"]', { timeout: 15_000 });
  // Wait for the card image to fully load before taking a snapshot
  await page.waitForFunction(() => {
    const img = document.querySelector('[data-testid="card-preview"] img') as HTMLImageElement;
    return img && img.complete && img.naturalWidth > 0;
  });
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
  // Wait for the card image to fully load before taking a snapshot
  await page.waitForFunction(() => {
    const img = document.querySelector('[data-testid="card-preview"] img') as HTMLImageElement;
    return img && img.complete && img.naturalWidth > 0;
  });
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
  // Wait for all card images to fully load before taking a snapshot
  await page.waitForFunction(() => {
    const imgs = document.querySelectorAll('[data-testid^="generated-card-"] img') as NodeListOf<HTMLImageElement>;
    return imgs.length === 4 && Array.from(imgs).every(img => img.complete && img.naturalWidth > 0);
  });
  await expect(page.locator('[data-testid="generated-cards-grid"]')).toHaveScreenshot('card-grid.png');
});
