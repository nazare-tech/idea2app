# UI Verification and Evidence
Every UI, visual, user-flow, or user-visible backend change must be tested through the real local UI as a real user, with screenshot/video evidence under ui-evidence/<date>/<task-slug>/.
No stubbing: never patch routes, stub providers, use fixtures, dummy env values, or bypass auth/database/image-generation to make verification faster; report blockers instead.
Real Chrome (profile Plasma / Profile 1) via the browser plugin is the default; e2e sign-in uses E2E_TEST_EMAIL / E2E_TEST_PASSWORD from .env.e2e.local, values never printed or committed.
Fresh-project evidence rule: loading, progressive generation, onboarding, or readiness UI changes need a NEW project created through the current real intake flow, not an old project.
Standardized intake tests use Idea 1.1 from docs/guides/idea-intake-test-cases.md by default; new wizard questions get answered by that file's policies and logged there.
Dev-server discipline: reuse or recover the real workspace dev server (stale .next/dev locks, occupied ports) and keep it running for the rest of the thread once started.
---

## Core rules

- For any UI, visual, user-flow, or user-visible backend change, test through the real local UI as a real user would. Do not patch routes, stub providers, switch to fixtures, shorten waits, use dummy environment values, or bypass auth/database/image-generation flows just to make verification faster. If the real dependency is unavailable, blocked, unsafe, or would spend money unexpectedly, report that blocker instead of faking the UI path.
- If a visual/UI change was requested, add it to the test plan and visually confirm the change actually happened before returning control.
- When a normal human would complete the task through the UI and the UI path exposes a bug, fix that UI/user-flow bug before continuing. Do not bypass the broken path with direct API/database calls unless an API-only workflow was explicitly requested.
- For backend changes, still look for the real user-facing UI path that proves the backend behavior when one exists, and include screenshots/video when useful. If only API/log/database verification is possible, explain why there is no meaningful UI evidence.
- For backend or non-visual changes, verify behavior with the best available tests, logs, requests, or local validation before returning control.

## Fresh-project evidence rule

For loading, progressive generation, onboarding progress, or derived-readiness UI changes: create a new project through the current real intake flow and capture the state during that project's generation. Older projects may reflect obsolete prompts, parsers, schemas, or section contracts; use them only as clearly labeled compatibility/regression evidence in addition to the fresh-project run.

## Standardized intake test cases

- Use `docs/guides/idea-intake-test-cases.md` for repeatable intake/UI/report-generation tests; Idea 1.1 by default unless another variant is requested or comparing outputs materially helps.
- When the intake wizard asks a new follow-up question, answer with the closest matching policy in that file, then append the exact question and answer to its observed question log.
- When behavior under test depends on generation timing or current artifact structure, complete project creation with Idea 1.1 and use that fresh project as the primary QA artifact.

## Evidence requirements

- Capture and share screenshot or video evidence in the same thread as the task. Screenshots for static states; short video when motion, loading, generation progress, or multi-step flows matter.
- Save under `ui-evidence/<date>/<task-slug>/` (inside the working tree, git-ignored). Include the exact route, viewport, and visible state tested, plus the artifact paths, in the plan or review artifact.

## Browser workflow

Real Google Chrome is the default verification browser so evidence matches the user's real browser/profile behavior. Codex uses the Codex Chrome plugin; Claude Code uses the claude-in-chrome MCP tools. Use an in-app/headless browser only for quick unauthenticated inspection when Chrome is genuinely unavailable and screenshot evidence is not required. Playwright e2e specs (see `docs/testing/e2e-guide.md`) complement, not replace, real-Chrome evidence for UI changes.

- Use Chrome profile name `Plasma` (Profile 1) when available. Multiple Chrome extension instances can be exposed; list browsers first and pick the entry whose metadata includes `profileName: "Plasma"` or `profileIsLastUsed: "true"`, rather than blindly taking the first extension entry. (Known-good browser id on 2026-07-03: `-d543-40af-b093-f0c18fc336f8`; a hint, not a guarantee.)
- If Chrome communication is flaky (Codex): run the plugin health checks before giving up: `scripts/chrome-is-running.js --json`, `scripts/installed-browsers.js --json`, `scripts/check-extension-installed.js --json`, `scripts/check-native-host-manifest.js --json` from the bundled Chrome plugin directory. Expected: selected profile `Profile 1`, extension installed and enabled, correct native messaging host manifest.
- If tab navigation through the browser API hangs, open Chrome directly to the local URL with the selected profile, then claim the already-loaded tab.
- If a DOM snapshot API fails (e.g. `incrementalAriaSnapshot is not a function`), fall back to stable locators, read-only `evaluate(...)`, and screenshots; not fatal.
- If Chrome or the browser controller becomes unavailable during required real-UI verification, first try to recover: reconnect to the existing tab, target the correct profile/extension instance, refresh/reopen the local route, verify dev server and session state. If the UI workflow still cannot be restored, stop and report the blocker; do not substitute direct API/database/server-side generation for the user-visible flow.

## Auth for local verification

When sign-in is required, read `.env.e2e.local` (`E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`) inside the automation script and sign in through the browser. Never print, paste, screenshot, or commit credential values.

## Dev server discipline

- Use this actual workspace and its real local environment. No copied workspaces, no dummy env values to bypass env/auth/database/dev-server problems.
- If a port appears occupied but the route is unreachable, inspect the listener and recover stale Next dev processes or `.next/dev` cache before blaming browser tooling. If a dev-server lock blocks startup, verify whether a server is actually reachable; if not, fix the stale lock or run on another port.
- Once a dev server is started for verification, keep it running for the rest of the thread unless asked to stop or it is clearly unsafe. If UI navigation fails or times out, first verify the dev server is still reachable before diagnosing browser tooling.
