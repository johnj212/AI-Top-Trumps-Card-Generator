import type { Page } from '@playwright/test';
import authFixture from '../fixtures/auth.json';
import statsFixture from '../fixtures/stats.json';
import cardIdeasFixture from '../fixtures/card-ideas.json';
import imageFixture from '../fixtures/image.json';
import { readFileSync } from 'fs';
import { join } from 'path';

const agentEventsText = readFileSync(
  join(__dirname, '../fixtures/agent-events.txt'),
  'utf-8'
);

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
    await route.fulfill({ status: 200, body: '{}' });
  });

  // Generate endpoint — route based on modelName in request body
  await page.route('**/api/generate', async (route) => {
    const body = route.request().postDataJSON() as { modelName: string };
    if (body.modelName === 'imagen-4.0-generate-001') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(imageFixture),
      });
    } else {
      // Text generation — return stats or card ideas based on prompt content
      const prompt = (body as any).prompt as string;
      if (prompt && prompt.toLowerCase().includes('card idea')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(cardIdeasFixture),
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
      await route.fulfill({ status: 200, body: '{"success":true}' });
    } else {
      await route.fulfill({ status: 200, body: '{"cards":[]}' });
    }
  });
}
