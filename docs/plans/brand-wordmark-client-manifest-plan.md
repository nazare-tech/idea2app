---
implemented: true
implemented_at: 2026-07-02T22:50:45Z
implementation_summary: Removed unnecessary client component boundaries from the shared brand wordmark and logo render components so server pages no longer require a fragile Turbopack client-manifest entry.
---

# Plan: Brand Wordmark Client Manifest Fix

## Goal
Fix the Next.js runtime error where Turbopack cannot find `src/components/layout/brand-wordmark.tsx#BrandWordmark` in the React Client Manifest, while preserving the shared Maker Compass brand/header rendering across landing, auth, and dashboard surfaces.

## Assumptions
- The failure is caused by an unnecessary client component boundary around a pure render component imported from server-rendered pages.
- `BrandWordmark` and `HeaderLogo` do not need hooks, browser APIs, or client-only libraries.
- No data model, API, auth, billing, or persistence behavior should change.

## Clarifying Questions
1. Should the fix prefer a minimal client-boundary removal or a larger component split?
   - Recommendation A: Remove `"use client"` from the pure brand/logo components so server pages do not need a client-manifest entry for the wordmark.
   - Trade-off: Smallest change and aligned with RSC defaults, but it depends on these components staying render-only.
   - Recommendation B: Split explicit `BrandWordmarkServer` and `BrandWordmarkClient` variants.
   - Trade-off: More explicit boundaries, but adds duplicate API surface for a simple component.
   - Selected: Recommendation A, because it is the simplest architecture-preserving fix and is locally verifiable.

## Recommended First Step
Confirm the wordmark/logo components are pure render components and that their consumers can still pass client-side handlers when imported through a client component.

## Plan
1. Inspect `BrandWordmark`, `HeaderLogo`, and their import sites for client-only behavior.
2. Remove unnecessary client boundaries from pure brand/logo render components.
3. Run focused static verification (`typecheck`, lint if practical, build).
4. Verify a local route that imports the wordmark from a server page no longer throws the client manifest error.
5. Record review/security findings and remediation status.

## Milestones
- Root cause identified: Pure component unnecessarily compiled as a client reference from server pages.
- Implementation complete: Wordmark/logo components render without requiring a direct client-manifest entry.
- Verification complete: Static checks and local runtime route load pass.

## Validation
- `npm run typecheck` passed.
- `npm run lint` passed with one pre-existing warning outside this change.
- `npm run build` passed after approved network access for Next font fetching.
- Local HTTP and in-app browser verification passed for `/`, `/auth`, and `/forgot-password`.
- Screenshot evidence saved under `ui-evidence/2026-07-02-brand-wordmark-manifest/`.

## Risks And Mitigations
- Risk: Removing `"use client"` could break event handler usage in client consumers.
  - Mitigation: In Next App Router, modules imported by client components are included in the client graph when they are client-safe; verify with typecheck/build.
- Risk: A stale `.next` cache may continue showing the old error.
  - Mitigation: Restart the dev server if needed; do not delete caches unless verification proves the code fix is insufficient.

## Rollback Or Recovery
- Re-add `"use client"` to the changed components if build/runtime verification shows Next requires these components to remain client entries.
- If the issue is cache-only, restart the dev server and clear `.next` only after asking before deletion.

## Open Decisions
- None.

## Critique

### Software Architect
- The best fix should reduce client/server boundary surface rather than adding another wrapper, because the component is shared by server and client surfaces.

### Product Manager
- The bug blocks first-page rendering and auth/landing entry points, so a narrow reliability fix has higher value than UI redesign.

### Customer Or End User
- Users should see the normal landing/auth/dashboard shell instead of a runtime error; there is no intended visual change.

### Engineering Implementer
- Keep the patch small and avoid touching unrelated brand styling, auth logic, or navigation behavior.

### Risk, Security, Or Operations
- No secrets or authorization logic are involved. Verification should avoid printing credentials and should not use fixture paths for user-visible runtime checks.
