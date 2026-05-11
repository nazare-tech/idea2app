# Review: Document Generation Status States

## Scope

- `src/lib/document-generation-display-status.ts`
- `src/lib/document-generation-display-status.test.ts`
- `src/components/workspace/project-workspace.tsx`
- `src/components/layout/anchor-nav.tsx`
- `src/components/layout/scrollable-content.tsx`

## Verification

- `node --import tsx --test src/lib/document-generation-display-status.test.ts`: passed.
- `npx.cmd tsc --noEmit`: passed.
- `npm.cmd run lint`: passed with existing warnings.
- `npm.cmd test`: passed, 192 tests.
- `npm.cmd run build`: first failed because sandbox network blocked Google Fonts; rerun with approved network access passed.
- Dev server responded on `http://localhost:3000` with HTTP 200.
- Headless Chromium navigation timed out in this sandbox, so exact authenticated dashboard visual verification remains manual.

## Code Review Findings

- Medium: server-side onboarding PRD/MVP generation does not currently expose persisted partial tokens to the dashboard. The UI supports live previews when a real active-session stream buffer exists and otherwise falls back to durable queue status. No code fix in this branch because a true durable stream requires backend persistence or broadcast design.
- Low: mockup option-level status is supported as an optional UI data shape but no real per-option backend progress is supplied yet. The UI correctly avoids synthetic option progress.

## Security Review Findings

- No new secrets, external services, payments, auth policies, or browser-write authority were introduced.
- Queue status remains display-only client state. Billing and generation authority still come from server-owned queue rows and existing API routes.
- Stream previews render through the existing markdown renderer, matching current document rendering behavior.

## Remediation Checklist

- [x] Keep empty/no-queue documents in an `idle` display state so old projects do not appear falsely queued.
- [x] Ensure content existence overrides stale queue state.
- [x] Document backend follow-up for durable PRD/MVP partial-token streaming.
- [x] Document backend follow-up for real mockup option progress.
