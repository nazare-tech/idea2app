---
name: ui-verification
description: This skill should be used for real UI verification, browser-driven reproduction, smoke testing, screenshots or video evidence, accessibility inspection, visual diffs, and local web or Electron debugging. It routes each task to real Chrome, an in-app browser, terminal Playwright, an existing smoke suite, or a local browser/CDP harness without vendoring externally updated browser drivers.
---

# UI Verification

Select smallest real verification path capable of proving user-visible behavior. Read repository UI-verification and e2e guidance first when present. Repository policy overrides generic routing.

## Load Project Policy

Read these files when they exist:

1. `docs/operating-system/ui-verification.md`
2. `docs/testing/e2e-guide.md`
3. `docs/testing/test-inventory.md`
4. Relevant setup/system documentation

Use real environment, authentication, data, and providers required by project policy. Never create confidence with fixtures, route patches, dummy environment values, hidden authentication bypasses, or provider stubs.

## Select Route

Choose exactly one primary route:

- Real user session, authenticated state, extension behavior, profile-specific behavior, or required visual evidence: use `chrome:control-chrome`.
- In-app browser inspection when Chrome is unavailable and project policy permits it: use `browser:control-in-app-browser`.
- One-off terminal navigation, form interaction, extraction, screenshot, or debugging without writing test files: prefer callable Playwright tool/plugin. If only local `playwright` skill exists, verify it uses current `@playwright/cli`; treat copies still instructing `@playwright/mcp` as stale and stop with update guidance.
- Existing Playwright/Cypress/e2e smoke suite: use Smoke Suite below.
- Local web, IDE, Electron, CDP, performance, memory, network, or accessibility harness: use Local Harness below.

Do not copy Browser, Chrome, or Playwright driver instructions into this skill. Keep those externally managed.

## Smoke Suite

1. Discover documented smoke command and target spec.
2. Build or start real prerequisites.
3. Run narrowest relevant spec before full suite.
4. Inspect trace, screenshot, video, console, and server logs on failure.
5. Isolate root cause.
6. Apply minimal fix only when task authorizes implementation.
7. Rerun focused spec, then broader suite when risk requires it.
8. Rerun passing fix once when flake risk exists.

Prefer stable roles, labels, visible text, and project-approved `data-*` hooks. Use deterministic assertions and event/state conditions; never replace them with arbitrary timeouts. Never quarantine tests unless explicitly requested and documented.

## Local Harness

1. Reuse repository Playwright, Cypress, Storybook, browser, or Electron harness.
2. Start documented local application command.
3. Select page/window by stable application marker, not tab order.
4. Capture initial screenshot or accessibility snapshot.
5. Perform one structural action.
6. Capture fresh state.
7. Verify expected change.
8. Repeat only as needed.

Use raw CDP only for evidence higher-level browser APIs cannot obtain: performance profiles, heap snapshots, rendering diagnostics, low-level network inspection, or multi-window Electron selection.

Do not add a browser dependency solely for a one-off probe unless user asks. Do not reuse hardcoded selectors, ports, credentials, or paths from another repository. Clean up task-created debug sessions and temporary profiles. Keep task-created servers running when project policy requires reuse for rest of thread.

## Evidence

Follow project evidence location and naming rules. Capture:

- Screenshot for static visual state
- Short video for motion, progressive loading, or multi-step flows
- Trace/logs for interaction or runtime failures
- Route, viewport, account/data state, and tested outcome in review artifact

Exclude secrets and unrelated private information. Do not store privacy-sensitive screenshots, traces, or heap snapshots without user authorization.

## Blockers

Stop and report blocker when required real dependency, authentication, browser connection, provider, data, or expected spend is unavailable or unsafe. Do not substitute a fake path and call it verified.

## Output Contract

Return:

- Route selected and why
- Environment/route/viewport tested
- Behavior verified
- Commands or interactions performed
- Evidence paths
- Failures fixed or remaining blockers
- Unverified risk

## Provenance

Consolidates stable routing concepts adapted from Cursor Team Kit:

- `https://github.com/cursor/plugins/blob/main/cursor-team-kit/skills/run-smoke-tests/SKILL.md`
- `https://github.com/cursor/plugins/blob/main/cursor-team-kit/skills/control-ui/SKILL.md`

Audited at Cursor Plugins commit `ba7b5907843e1e21ec692418c180e1f912cbf7d3` on 2026-07-26; target paths last changed on 2026-02-17 and 2026-04-30. Browser, Chrome, and Playwright remain external dependencies. See `LICENSE.txt`.
