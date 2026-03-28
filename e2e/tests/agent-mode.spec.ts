import { test, expect } from '@playwright/test';
import { setupMocks } from '../helpers/mock-api';
import { skipLoginViaStorage } from '../helpers/auth';

// Prompt that contains style-inferable words so AgentChat skips the
// colour-scheme / image-style question bubbles and goes straight to the API.
// inferStyleFromText splits option.name on whitespace (so "Blue-Silver" is one
// token) and checks whether each token appears in the lowercased prompt.
// "Blue-Silver" (single hyphenated token) → matched by "blue-silver" in prompt
// "holographic" → one of the tokens in "Holographic Foil Effect" → matched
const AGENT_PROMPT = 'Create a blue-silver holographic dragon card';

test.beforeEach(async ({ page }) => {
  await setupMocks(page);
  await skipLoginViaStorage(page);
});

test('switching to Agent Mode shows chat UI and hides design controls', async ({ page }) => {
  await page.click('[data-testid="agent-mode-btn"]');
  await expect(page.locator('[data-testid="agent-chat-input"]')).toBeVisible();
  // Design Mode controls should not be visible
  await expect(page.locator('[data-testid="theme-select"]')).not.toBeVisible();
});

test('submitting a prompt shows SSE tool progress events in chat', async ({ page }) => {
  await page.click('[data-testid="agent-mode-btn"]');
  await page.fill('[data-testid="agent-chat-input"]', AGENT_PROMPT);
  await page.click('[data-testid="agent-submit-btn"]');

  // The SSE fixture emits a card_complete event. After streaming finishes the
  // agent message bubble is updated with progressItems (including card_complete).
  // We assert on the persistent card-complete line ("Test Dragon") which is
  // rendered inside the final agent message bubble — not the transient live
  // progress overlay that disappears when isGenerating goes false.
  await expect(page.locator('text=Test Dragon').first()).toBeVisible({ timeout: 10_000 });
});

test('agent completes and cards appear in grid', async ({ page }) => {
  await page.click('[data-testid="agent-mode-btn"]');
  await page.fill('[data-testid="agent-chat-input"]', AGENT_PROMPT);
  await page.click('[data-testid="agent-submit-btn"]');

  // card_complete event in the SSE fixture triggers onCardsGenerated → a
  // CardPreview element appears on the right-hand side of the layout.
  await expect(page.locator('[data-testid="card-preview"]').first()).toBeVisible({ timeout: 15_000 });
});

test('visual snapshot: agent-generated card grid is clean with no image overlap', async ({ page }) => {
  await page.click('[data-testid="agent-mode-btn"]');
  await page.fill('[data-testid="agent-chat-input"]', AGENT_PROMPT);
  await page.click('[data-testid="agent-submit-btn"]');

  await expect(page.locator('[data-testid="card-preview"]').first()).toBeVisible({ timeout: 15_000 });

  // Wait for image to load
  await page.waitForFunction(() => {
    const imgs = document.querySelectorAll(
      '[data-testid="card-preview"] img'
    ) as NodeListOf<HTMLImageElement>;
    return imgs.length > 0 && Array.from(imgs).every(img => img.complete && img.naturalWidth > 0);
  });

  await expect(page.locator('[data-testid="card-preview"]').first()).toHaveScreenshot('agent-card.png');
});

test('SSE stream error event shows error message in chat', async ({ page }) => {
  // Override the agent mock to return a properly-formatted SSE error event
  await page.route('**/api/agent/chat', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
      body: 'event: error\ndata: {"message":"Something went wrong"}\n\n',
    });
  });

  await page.click('[data-testid="agent-mode-btn"]');
  await page.fill('[data-testid="agent-chat-input"]', AGENT_PROMPT);
  await page.click('[data-testid="agent-submit-btn"]');

  // AgentChat catches the error event, throws, and renders a bubble with
  // isError=true which gets data-testid="agent-error"
  await expect(page.locator('[data-testid="agent-error"]')).toBeVisible({ timeout: 10_000 });
});
