# UI Verification and Evidence
Every UI, visual, user-flow, or user-visible backend change must be tested through the real local UI as a real user, with screenshot/video evidence under ui-evidence/<date>/<task-slug>/.
No stubbing: never patch routes, stub providers, use fixtures, dummy env values, or bypass auth/database/external generation to make verification faster; report blockers instead.
The real browser is the default verification surface; local sign-in reads test credentials from an ignored env file (for example .env.e2e.local) and never prints or commits their values.
Fresh-artifact rule: loading, progressive generation, onboarding, or readiness UI changes need a NEW entity created through the current real flow, not an old one from a previous contract.
Standardized test inputs keep runs comparable: keep the canonical input set in docs/guides/ and log every new question or branch the flow asks.
Dev-server discipline: reuse or recover the real local dev server rather than working around it, and keep it running for the rest of the thread once started.
---

## Core rules

- For any UI, visual, user-flow, or user-visible backend change, test through the real local UI as a user would. Do not patch routes, stub providers, switch to fixtures, shorten waits, use dummy environment values, or bypass auth/database/external-generation flows just to make verification faster. If the real dependency is unavailable, blocked, unsafe, or would spend money unexpectedly, report that blocker instead of faking the UI path.
- If a visual/UI change was requested, add it to the test plan and visually confirm the change actually happened before returning control.
- When a normal human would complete the task through the UI and the UI path exposes a bug, fix that UI/user-flow bug before continuing. Do not bypass the broken path with direct API/database calls unless an API-only workflow was explicitly requested.
- For backend changes, still look for the real user-facing UI path that proves the backend behavior when one exists, and include screenshots or video when useful. If only API/log/database verification is possible, explain why there is no meaningful UI evidence.
- For backend or non-visual changes, verify behavior with the best available tests, logs, requests, or local validation before returning control.

## Fresh-artifact evidence rule

For loading, progressive generation, onboarding progress, or derived-readiness UI changes: create a new entity through the current real flow and capture the state during that run. Older entities may reflect obsolete prompts, parsers, schemas, or contracts; use them only as clearly labeled compatibility/regression evidence in addition to the fresh run.

## Standardized test inputs

- Keep a canonical set of test inputs (the same idea, order, or fixture-free scenario every time) in `docs/guides/{{TEST-CASES FILE}}` so runs are comparable across changes. Create that file the second time you improvise inputs for the same flow.
- When the flow asks a new question or takes a new branch, answer with the closest matching policy in that file, then append the exact question and answer to its observed log.
- When behavior under test depends on timing or current artifact structure, complete the flow fresh and use that run as the primary QA artifact.

## Evidence requirements

- Capture and share screenshot or video evidence in the same thread as the task. Screenshots for static states; short video when motion, loading, generation progress, or multi-step flows matter.
- Save under `ui-evidence/<date>/<task-slug>/` (inside the working tree, git-ignored). Include the exact route, viewport, and visible state tested, plus the artifact paths, in the plan or review artifact.
- Never expose secrets, raw credentials, tokens, private keys, or unrelated private user data in evidence.

## Browser workflow

The user's real browser is the default verification surface so evidence matches real browser/profile behavior. Each agent runtime has its own browser control tooling; use whichever this runtime provides, and record which one produced the evidence. Use an in-app or headless browser only for quick unauthenticated inspection when the real browser is genuinely unavailable and screenshot evidence is not required. Automated e2e specs (see `docs/testing/e2e-guide.md`) complement, not replace, real-browser evidence for UI changes.

- Pin a specific browser profile for verification when several exist; list available browsers and select by profile metadata rather than taking the first entry.
- If browser control is flaky, run the runtime's health checks before giving up (extension installed and enabled, native messaging host present, correct profile selected).
- If tab navigation through the browser API hangs, open the browser directly at the local URL with the selected profile, then claim the already-loaded tab.
- If a DOM snapshot API fails, fall back to stable locators, read-only evaluation, and screenshots; not fatal.
- If the browser or its controller becomes unavailable during required real-UI verification, first try to recover: reconnect to the existing tab, target the correct profile, refresh/reopen the local route, verify dev server and session state. If the UI workflow still cannot be restored, stop and report the blocker; do not substitute direct API/database/server-side calls for the user-visible flow.

## Auth for local verification

When sign-in is required, read test credentials from a git-ignored local env file (for example `.env.e2e.local` with `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`) inside the automation script and sign in through the browser. Never print, paste, screenshot, or commit credential values.

## Dev server discipline

- Use this actual workspace and its real local environment. No copied workspaces, no dummy env values to bypass env/auth/database/dev-server problems.
- If a port appears occupied but the route is unreachable, inspect the listener and recover stale dev processes or build-cache locks before blaming browser tooling.
- Once a dev server is started for verification, keep it running for the rest of the thread unless asked to stop or it is clearly unsafe. If UI navigation fails or times out, first verify the dev server is still reachable before diagnosing browser tooling.
