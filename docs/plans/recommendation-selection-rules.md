# Recommendation Selection Rules

Use this file to generalize feedback about when the default Recommendation A should not be chosen.

## Default Rule

Choose Recommendation A for open clarifying questions and proceed without waiting when it is the simplest reasonable path, keeps scope controlled, preserves existing architecture, and can be verified locally.

## Override Rules

- If the user explicitly names a preference, constraint, option, or trade-off in the prompt, follow that instead of defaulting to Recommendation A.
- If Recommendation A would delete data, overwrite existing files, expose secrets, weaken auth/RLS, make irreversible production changes, require missing credentials, or incur open-ended/production spend, stop and ask before taking that step.
- Do not treat small, expected local QA spend from configured AI/API services as a blocker when that spend is necessary to verify the real user flow or capture durable test artifacts.
- If an existing repo pattern clearly favors Recommendation B, choose the repo pattern and record why.
- If Recommendation A optimizes implementation speed but Recommendation B better preserves user trust, data durability, security, or future maintainability, choose Recommendation B.
- If Recommendation A is the fastest local patch but Recommendation B adds a reusable durability, idempotency, ownership-validation, prompt/parser/render contract-sync, typed-validation, bounded-repair, recovery, observability, or modularity pattern that fits the existing architecture, prefer Recommendation B unless it creates disproportionate scope, risk, cost, or delay.
- If a correction reveals a durable preference, add a new rule below with the root reason, not just the surface-level choice.

## Feedback Capture Process

When the user says a different recommendation should have been chosen:

1. Update the implementation to match the corrected recommendation when practical.
2. Ask what underlying preference, constraint, or product principle made that option better.
3. Record the generalized rule in this file after the root reason is clear.
4. Link the plan or review artifact where the correction happened.

## Learned Rules

### 2026-06-29: Do Not Migrate Historical Backend Data By Default

- Prefer: Recommendation A when the safe current-path fix is to update new writes, current readers, or forward behavior without migrating older backend rows.
- Reason: Keep scope controlled and avoid unnecessary historical data migration risk. Older backend data should be migrated to a new schema or data shape only when the user explicitly asks for that migration.
- Example: When fixing future canonical mockup image URLs, update the save path for new `mockups.content` rows without automatically rewriting existing saved rows that used the older URL shape.

### 2026-06-30: Prefer Real Paid Verification For Durable QA Artifacts

- Prefer: Recommendation B when Recommendation A avoids small expected AI/API spend but Recommendation B runs the real local user flow and captures durable QA evidence, generated questions, reports, or fixtures.
- Reason: Avoiding small expected verification spend can create more future work than it saves. For Maker Compass, realistic intake/report QA depends on the actual AI-backed flow, so local verification should use configured real services unless the spend is open-ended, production-impacting, credential-blocked, destructive, or explicitly unsafe.
- Example: `docs/plans/standardized-intake-test-cases-plan.md` should have selected the live authenticated intake flow for capturing current follow-up questions instead of avoiding OpenRouter-backed generation only to save API budget.

### 2026-06-30: Fix Real UI Flow Bugs Before Using Lower-Level Bypasses

- Prefer: The real local UI path when a normal user would complete the task through the UI, even if an API/database shortcut is available.
- Reason: API access is useful for inspection and artifact capture, but it must not hide user-flow bugs. If the UI path exposes a blocker, fix that blocker first, then continue through the UI unless the user explicitly requests an API-only workflow or the UI is genuinely unavailable.
- Example: During `docs/plans/actionable-document-structure-plan.md`, `/projects/new` rendered a 3-question intake set that `create-from-intake` later rejected. The correct workflow is to fix the intake UI/generation mismatch before creating baseline projects, not bypass project creation through direct API calls.

### 2026-06-30: Stop Instead Of Replacing Required UI Verification With Server/API Fallbacks

- Prefer: Stopping and reporting a blocker when the task specifically requires a normal-user UI flow and the in-app browser or browser controller cannot be recovered.
- Reason: A server/API fallback can produce data but does not verify the user-visible workflow, screenshots, loading states, auth/session behavior, or browser-only failures the task is meant to test. If the browser tool fails, verify that the local dev server is still running and reachable before blaming the browser controller; then try to reconnect, restart/reopen the browser route, and recover the UI session. If that does not restore the UI path, stop rather than substituting lower-level generation.
- Example: During `docs/plans/actionable-document-structure-plan.md`, after-project artifacts were generated through the server-side onboarding pipeline after UI navigation failed. The likely root cause was that the local dev server had stopped. Future runs should keep any started dev server running, verify server reachability first, recover the browser workflow, or stop and ask/report the blocker.

### 2026-06-30: Keep Started Dev Servers Running During UI Work

- Prefer: Leaving a local dev server running once started for UI verification, unless the user asks to stop it or it is clearly unsafe.
- Reason: Stopping the server can look like browser/controller failure and can invalidate real-user UI verification. The server process is part of the test environment, so preserving it keeps screenshots, navigation, auth, and long-running generation flows inspectable.
- Example: If a UI test cannot navigate to `localhost:3000`, first check that the dev server is still listening and serving the route before switching tools or using API/server-side shortcuts.

### 2026-07-09: Use Fresh Projects For Generation-State UI Verification

- Prefer: Creating a new project through the current real intake and generation pipeline when verifying loading, progressive generation, onboarding progress, derived readiness, or generated-artifact structure.
- Reason: Older projects contain artifacts produced by older prompts, parsers, schemas, and renderer contracts. They can be valuable compatibility fixtures, but they cannot prove that the current pipeline produces the intended transient state or current artifact shape.
- Example: NAZ-118 was initially evidenced with a nine-day-old Signal To Roadmap project. That screenshot proved terminal incomplete handling for legacy content, but it did not prove the current AI Prompts partial state while a newly created project was generating. Future loading-state work must use a fresh Idea 1.1 project as primary evidence and label older-project screenshots as supplemental regression evidence.

### 2026-07-10: Preserve Structural Placeholders That Mirror Navigation During Loading Cleanups

- Prefer: Keeping per-item placeholder containers (cells, cards, sections) that correspond one-to-one with visible navigation entries when simplifying loading UI; remove only redundant status chrome (extra status rows, chips, labels) layered on top of them.
- Reason: Placeholder structure is part of the page's information architecture. When the side rail lists Concept 1/2/3 (or file names, or sections), the content pane must show a matching container per entry so the nav and the pane never disagree; collapsing them into one generic loader breaks that parity. "Remove the loading noise" feedback targets duplicate status indicators, not the structural skeletons.
- Example: `docs/plans/workspace-streaming-nav-follow-and-loading-states-plan.md` (Q3): the correction was to keep the three Design Mockups concept placeholder cells (hosting the WebGL loader inside each pending cell) and remove only the per-option "Option A/B/C generating" status rows above them.

Use this format for future entries:

```markdown
### YYYY-MM-DD: <short rule title>

- Prefer: Recommendation <A/B> when <condition>.
- Reason: <root preference or constraint>.
- Example: <plan/review file or brief scenario>.
```
