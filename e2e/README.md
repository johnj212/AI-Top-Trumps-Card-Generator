# E2E Tests

Playwright tests for AI Top Trumps Card Generator. All Gemini API calls are mocked — no real AI costs, fully deterministic.

## Prerequisites

Both dev servers must be running (or Playwright will start them automatically):
- Frontend: port 8088 (Vite)
- Backend: port 3001 (Express)

## Commands

```bash
# Run all tests
npx playwright test

# Run a specific suite
npx playwright test e2e/tests/auth.spec.ts

# Open interactive Playwright UI
npx playwright test --ui

# Update visual baseline screenshots
npx playwright test --update-snapshots
```

## Visual Baselines

Screenshots are committed in `e2e/screenshots/`. When intentionally changing the UI, run `--update-snapshots` and commit the new baselines.

## Structure

```
e2e/
  fixtures/       Mock API response data
  helpers/        Shared helpers (mock setup, auth)
  tests/          Test suites by feature
  screenshots/    Committed visual baselines
```
