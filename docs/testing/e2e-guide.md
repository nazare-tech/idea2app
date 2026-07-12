# E2E Guide (Playwright)
Playwright suite in e2e/ with two tiers: free smoke (npm run e2e: landing, idea-floor validation, real sign-in, wizard step 1) and paid (npm run e2e:paid, gated by E2E_PAID_FLOWS=1).
Config playwright.config.ts loads .env.e2e.local (E2E_TEST_EMAIL/E2E_TEST_PASSWORD) itself, reuses a running dev server on localhost:3000 or starts npm run dev, Chromium only.
The free tier must stay free: no /api/intake/questions calls, no project creation, no generation queue starts; the paid spec stops before Create project on purpose.
Real flows only, per docs/operating-system/ui-verification.md: no route patching, no fixtures, no auth bypass; specs sign in through the real auth modal with real credentials.
Writing rules: role/placeholder-based locators, expect-based waiting (no waitForTimeout), one user journey per test, skip with a reason when preconditions are missing.
Every new spec gets a row in docs/testing/test-inventory.md in the same commit; false-confidence e2e (asserting a page loaded without asserting behavior) is a review finding.
---

## Running

```bash
npx playwright install chromium   # one-time on a fresh clone (browser download)
npm run e2e         # free smoke tier (no AI spend, no project creation)
npm run e2e:paid    # + paid specs (small AI spend: intake question generation)
npx playwright test e2e/smoke.spec.ts --headed   # watch a run
```

The config reuses an already-running dev server at `http://localhost:3000` (or starts `npm run dev` itself). Override the target with `E2E_BASE_URL`.

Credentials come from `.env.e2e.local` (`E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`), loaded by the config. Never print, screenshot, or commit the values; specs that need them must `test.skip` with a clear reason when they are absent.

## Tiers

| Tier | Command | May cost | Contents |
|---|---|---|---|
| Free smoke | `npm run e2e` | Nothing | Landing render, idea validation floor, real sign-in, wizard step 1 gating |
| Paid | `npm run e2e:paid` | Small AI spend | Intake step 2 with real AI question generation (stops before Create project) |
| Full generation | not automated | Real credits + minutes | Fresh project through the full queue: agent/manual flow per `docs/operating-system/ui-verification.md`, evidence under `ui-evidence/` |

Never move a paid interaction into the free tier. Project creation (`Create project`) starts the onboarding generation queue and must not appear in any automated spec.

## Writing specs

- **Real flows only** (`docs/operating-system/ui-verification.md`): no route patching, provider stubbing, fixtures, or auth bypass. If the real dependency is unavailable, skip with the blocker named, don't fake it.
- **Locators**: prefer `getByRole`, then `getByPlaceholder`/`getByText` with exact strings from the component source. No CSS-class selectors (Tailwind churn breaks them).
- **Waiting**: only `expect(...).toBeVisible()/toBeEnabled()` and `waitForURL`. Never `waitForTimeout`.
- **Scope**: one user journey per test; assert behavior (button disabled, URL changed, cards rendered), not just that a page loaded.
- **Idea 1.1** (`docs/guides/idea-intake-test-cases.md`) is the canonical intake idea; keep the spec constant in sync with that doc.
- **Inventory**: add every new spec to `docs/testing/test-inventory.md` in the same commit.

## What to avoid (false-confidence patterns)

- Asserting the page title or a wrapper div exists and calling the flow "tested".
- Waiting on skeleton/loading copy instead of the real content contract.
- Catch-and-continue around expects to make a flaky spec pass.
- Duplicating unit-test coverage (parsers, stores) as slow browser tests; e2e is for user journeys.
