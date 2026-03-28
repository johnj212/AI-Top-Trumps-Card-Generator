import type { Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const authFixture = JSON.parse(readFileSync(join(process.cwd(), 'e2e/fixtures/auth.json'), 'utf-8'));
const statsFixture = JSON.parse(readFileSync(join(process.cwd(), 'e2e/fixtures/stats.json'), 'utf-8'));
const cardIdeasFixture = JSON.parse(readFileSync(join(process.cwd(), 'e2e/fixtures/card-ideas.json'), 'utf-8'));
const imageFixture = JSON.parse(readFileSync(join(process.cwd(), 'e2e/fixtures/image.json'), 'utf-8'));
const agentEventsText = readFileSync(join(process.cwd(), 'e2e/fixtures/agent-events.txt'), 'utf-8');

export async function setupMocks(page: Page): Promise<void> {
  // Auth login — valid code returns token, anything else returns 401
  await page.route('**/api/auth/login', async (route) => {
    const body = route.request().postDataJSON() as { playerCode: string };
    if (body.playerCode === 'TIGER34') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(authFixture.login),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid player code' }),
      });
    }
  });

  // Auth validate — always valid
  await page.route('**/api/auth/validate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(authFixture.validate),
    });
  });

  // Auth logout
  await page.route('**/api/auth/logout', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  // Generate endpoint — route based on modelName in request body
  await page.route('**/api/generate', async (route) => {
    const body = route.request().postDataJSON() as { modelName: string; prompt?: string };
    if (body.modelName === 'imagen-4.0-generate-001') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(imageFixture),
      });
    } else {
      // Text generation — card-ideas prompts always start with the creative assistant preamble;
      // stats generation is done locally and never calls this endpoint, so any text request here
      // is a card-ideas request. Check the distinctive prefix as a safety net.
      if (body.prompt && body.prompt.startsWith('You are a creative assistant for a Top Trumps card game')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ kind: 'json', data: cardIdeasFixture }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(statsFixture),
        });
      }
    }
  });

  // Agent chat — SSE stream
  await page.route('**/api/agent/chat', async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      body: agentEventsText,
    });
  });

  // Cards save/list
  await page.route('**/api/cards', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"cards":[]}' });
    }
  });
}
