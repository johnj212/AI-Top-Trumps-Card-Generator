# E2E Testing Design — AI Top Trumps Card Generator

**Date:** 2026-03-27
**Scope:** Playwright-based E2E test suite for local development verification
**Status:** Approved

---

## Goals

- Catch regressions in authentication, card generation, and visual layout
- Run locally (not in CI) against the real dev servers
- All Gemini/Imagen API calls are mocked — no real AI costs, deterministic results
- Visual snapshots verify card layout is clean (no overlapping elements, correct download output)

---

## Project Structure

```
e2e/
  fixtures/
    auth.json           # Login/validate mock responses
    stats.json          # Stats generation mock response
    card-ideas.json     # Card ideas generation mock response
    image.json          # Image generation mock response (tiny valid base64 JPEG)
    agent-events.json   # SSE event sequence for agent mode
  helpers/
    auth.ts             # Login helper reused across all specs
    mock-api.ts         # Playwright page.route() setup for all mocked endpoints
  tests/
    auth.spec.ts
    design-mode.spec.ts
    agent-mode.spec.ts
  screenshots/          # Committed baseline snapshots (updated with --update-snapshots)
playwright.config.ts    # Root level — webServer config starts both dev servers
```

---

## Infrastructure

### Dev Servers
Playwright `webServer` config starts:
- Frontend: `npm run dev` on port 8088
- Backend: `npm run server` on port 3001

Tests run against `http://localhost:8088`.

### Mocking
All API calls intercepted via `page.route()` in `helpers/mock-api.ts` before reaching the backend. Applied in a `beforeEach` block within each spec.

| Endpoint | Mock Response |
|---|---|
| `POST /api/auth/login` | `{ token: "test-jwt" }` for `TIGER34`; 401 for anything else |
| `GET /api/auth/validate` | `{ valid: true }` |
| `POST /api/generate` (stats) | `{ kind: "json", data: ["Speed", "Power", "Strength", "Agility", "Intelligence", "Stamina"] }` |
| `POST /api/generate` (card ideas) | `{ kind: "json", data: [{ title: "Test Card", stats: {...}, imagePrompt: "a test image" }] }` |
| `POST /api/generate` (image) | `{ kind: "image", mime: "image/jpeg", data: "<base64 1x1 valid JPEG>" }` |
| `POST /api/agent/chat` | SSE stream: `tool_start` → `tool_done` × 4 → `card_complete` → `done` |

The image fixture is a real (tiny) valid base64 JPEG so the `<img>` element renders correctly — essential for meaningful visual snapshots.

### Visual Snapshots
- Uses Playwright's built-in `toHaveScreenshot()`
- Pixel diff threshold: 2%
- Baselines committed to `e2e/screenshots/`
- Update with: `npx playwright test --update-snapshots`

---

## Test Coverage

### `auth.spec.ts`
1. Valid player code (`TIGER34`) logs in → app main screen renders
2. Invalid player code → error message shown, stays on login screen
3. Page refresh with valid session → stays logged in (token persists in localStorage)
4. Logout → returns to login screen, app state cleared

### `design-mode.spec.ts`
1. Selecting a theme → stats auto-populate in the control panel
2. Selecting color scheme + image style → preview card updates styling
3. "Generate Preview" → card renders with image, title, stats, rarity badge
4. **Visual snapshot:** card preview — no overlapping elements, clean layout
5. **Visual snapshot:** downloaded PNG — correct dimensions, clean layout, no cropping
6. Download button triggers file download
7. "Generate Pack" → 4 cards appear in the grid
8. **Visual snapshot:** card grid — cards do not overlap, clean spacing

### `agent-mode.spec.ts`
1. Switching to Agent Mode → chat UI visible, Design Mode controls hidden
2. Submitting a natural language prompt → SSE tool progress events displayed in chat
3. Agent completes → cards appear in grid
4. **Visual snapshot:** agent-generated card grid — no image overlap, clean layout
5. SSE stream returns error event → error message shown in chat UI

---

## Out of Scope

- CI/CD integration (local only for now)
- Cross-browser testing (Chromium only for now)
- Mobile viewport testing (deferred)
- Real Gemini/Imagen API calls

---

## Running Tests

```bash
# Run all tests
npx playwright test

# Run a specific suite
npx playwright test e2e/tests/auth.spec.ts

# Update visual baselines
npx playwright test --update-snapshots

# Open interactive UI
npx playwright test --ui
```
