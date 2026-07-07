# Thermo-Nuclear Code Quality Review — 2026-07-06

**Scope**: The "UI performance round 2" changeset (`49eb0bcf..81f5998a`: landing media loading, workspace polling/layout work, server-rendered billing), plus codebase-health flags required by the review standard.

**Method**: [thermo-nuclear-code-quality-review](https://github.com/cursor/plugins/blob/main/cursor-team-kit/skills/thermo-nuclear-code-quality-review/SKILL.md) — strict maintainability review focused on abstraction quality, spaghetti-condition growth, file size, and "code judo" restructurings that preserve behavior.

**Verdict**: The changeset's *direction* is good (server-rendered billing, static landing captures, visibility-aware polling all reduce real work). But it does not meet the approval bar as-is. Three presumptive blockers: an unnecessary `unknown`-laundering type layer duplicating the generated database types (F1), hidden-coupling containment conditionals copy-pasted across the workspace section list (F2), and a duplicated capture manifest with a silent wrong-image fallback (F4). None are behavior bugs; all are structure. Each has a clear, behavior-preserving fix below.

---

## F1 (BLOCKER): `billing-page-data.ts` re-derives types the generated `Database` types already guarantee

**Where**: `src/lib/billing-page-data.ts` (new file, 141 lines), consumed by `src/app/(dashboard)/billing/page.tsx`.

**Problem**: The Supabase server client is typed — `createServerClient<Database>` in `src/lib/supabase/server.ts:8`, with `plans` and `plan_prices` rows fully described in `src/types/database.ts`. So the billing page's `select("*, plan_prices(*)")` result is *already typed end to end*. Yet `billing-page-data.ts` treats it as `unknown` and rebuilds the types by hand: `isRecord`, `stringOrNull`, `numberOrZero`, `booleanOrFalse`, per-field defaulting (`interval_unit ?? "month"`, `label ?? "Monthly"`), and `as string` casts. Roughly 90 of the 141 lines are defensive normalization of data whose shape the compiler already knows. This is exactly the "unnecessary `unknown`/cast-heavy code where a clearer type boundary could exist" smell — and the invented fallbacks (`plan_id ?? ""`, `status ?? "active"`) silently paper over what would be schema drift, the one thing you'd actually want to fail loudly.

**Code judo**: Delete the normalization layer. Define the page's row shapes from the generated types:

```ts
type PlanRow = Database["public"]["Tables"]["plans"]["Row"]
type PlanPriceRow = Database["public"]["Tables"]["plan_prices"]["Row"]
export type BillingPlan = PlanRow & { plan_prices: PlanPriceRow[] }
```

Keep only what's real logic: the `is_active` filter + `sort_order` sort (3 lines), `isCheckoutReadyPlanPrice`, `isYearlyPrice`, `getPriceForInterval`, `getInitialBillingInterval`, and the `features` JSON-column string-array narrowing (the single field where runtime narrowing is legitimate, since `features` is a `Json` column). The file should land at ~50 lines with a stronger contract than the 141-line version.

**Related boundary smell, same page**: `supabase as unknown as ProjectAllowanceClient` (carried over from the old client page into `billing/page.tsx`, and repeated in `projects/page.tsx`). A double cast through `unknown` on every call site means `ProjectAllowanceClient` is misdeclared. Fix the interface once (accept the typed client, or declare the minimal structural query surface it actually uses) and delete the casts at all call sites.

---

## F2 (BLOCKER): containment conditionals hardcode the nav→document mapping five times, including a literal that reads as a bug

**Where**: `src/components/layout/scrollable-content.tsx:300-399`.

**Problem**: Each of the five `DocumentWrapper` blocks got two new inline props:

```tsx
<DocumentWrapper navKey="ai-prompts" performanceContain={activeDocument !== "mvp"} intrinsicSize="auto 1800px">
```

Two issues:

1. **Hidden coupling.** `ai-prompts` containment keyed off `"mvp"` is *correct* — the AI Prompts nav item has `sourceType: "mvp"` in `src/lib/document-sections.ts:111` — but nothing at the call site says so. Every future reader will flag it as a copy-paste bug, and if the ai-prompts `sourceType` ever changes, this literal silently breaks containment. The mapping this conditional encodes **already exists** in `SCROLLABLE_NAV_ITEMS`; hardcoding it a second time is architectural drift.
2. **The five-block copy-paste got heavier.** The section list was already five near-identical blocks (skeleton label / content check / renderer / placeholder); this diff added two more per-block props, growing the repetition instead of collapsing it.

**Code judo**: Drive the section list from a registry instead of five hand-written blocks. `SCROLLABLE_NAV_ITEMS` already knows every navKey and its `sourceType`; add the per-section pieces it's missing (skeleton label, intrinsic size estimate, render function) either there or in a local `WORKSPACE_SECTIONS` array in this file, then render with one map:

```tsx
{WORKSPACE_SECTIONS.map(({ navKey, sourceType, intrinsicSize, skeletonLabel, render }) => (
  <DocumentWrapper
    key={navKey}
    navKey={navKey}
    performanceContain={activeDocument !== sourceType}
    intrinsicSize={intrinsicSize}
  >
    {!renderDeferred ? <DocumentSkeleton label={skeletonLabel} /> : render(...)}
  </DocumentWrapper>
))}
```

The `"mvp"` literal disappears (derived from the same registry the nav uses), the magic intrinsic sizes (`2600/3200/2800/1200/1800px`) get one named home, and adding a sixth document becomes a registry entry instead of a 20-line block. This also shrinks a 427-line file that keeps absorbing per-section knobs.

---

## F3: the two-phase scroll is a timing-dependent special case bolted into an already busy callback

**Where**: `src/components/workspace/use-workspace-scroll-sync.ts:188-225`.

**Problem**: `scrollToSection` gained a `shouldTwoPhaseScroll` branch: scroll to the source frame, then `requestAnimationFrame`, re-query the exact target, scroll again. The *reason* this exists — a `content-visibility: auto` frame reports a wrong/estimated target offset until `setActiveDocument` commits and containment is removed — appears nowhere in the code. The implementation has the classic marks of an ad-hoc patch:

- **Unstated ordering dependency**: it works only if React commits the `activeDocument` change (removing containment) before the rAF callback measures. React does not guarantee commit-before-rAF ordering for a state update queued in the same task; this is "usually true" timing, not a contract.
- **Duplicated, inconsistent selector logic**: the first lookup escapes (`CSS.escape(navKey)`), the rAF re-query does not (`[data-section="${targetId}"]`), and the same `#id` / `[data-section]` fallback pair now exists in two places in the hook.
- **Widened dependencies**: `activeDocument` joins the `scrollToSection` deps, recreating the callback (and re-running the hash effect wiring) on every active-document change, purely to feed the heuristic.
- **Racing cleanup**: `isScrollingProgrammatically` is cleared by a 50ms `setTimeout` while the second scroll happens inside a rAF; the guard's coverage of phase two is accidental.

**Code judo**: Make "render, then scroll" explicit instead of heuristic. Model the pending navigation as state (`pendingScrollTargetId`), let the `activeDocument` change commit, and perform the single, final scroll in a `useLayoutEffect` that fires *after* containment is removed:

```
click → setActiveDocument(sourceType) + setPendingScrollTarget(targetId)
layout effect (runs post-commit, containment gone) → scrollToTarget → clear pending
```

This deletes `shouldTwoPhaseScroll`, `getNavKeyForScrollTarget`, the rAF re-query, and the double-scroll entirely — one scroll, measured against correct layout, guaranteed by React's effect ordering instead of frame timing. If the heuristic is kept instead, it needs the why-comment, `CSS.escape` on the second query, and a shared target-resolution helper — but the reframe is the better spend.

---

## F4 (BLOCKER): the landing capture manifest lives in two places, and a miss silently shows the wrong screenshot

**Where**: `scripts/export-landing-sample.mjs:68-94` (`PREVIEW_CAPTURES`) and `src/components/landing/feature-product-preview.tsx:853-872` (`previewCapturePaths`).

**Problem**: The same five navKey/sectionId→PNG mappings are declared twice — once for the capture script, once for the component — with different shapes (object list vs. `"navKey|activeSectionId|cropToId"` composite-string keys). They will drift: add a sixth feature section to `src/app/page.tsx` and the component compiles fine, the script captures nothing, and `getCapturePath` falls back to... the Market Research screenshot, silently, on the production marketing page. A wrong-product-screenshot failure mode with zero signal is worse than a crash. The composite string key is also a "magic" encoding of what is naturally a typed lookup.

**Code judo**: One manifest, one derivation:

- Create `src/lib/landing-preview-captures.ts` exporting the capture list (`navKey`, `activeSectionId`, `fileName`). The script imports it (it already runs under Node with ESM); the component derives `/landing/samples/previews/${fileName}` from it. The composite-key map and `getCapturePath` disappear.
- Make a lookup miss loud: throw in development / log an error in production instead of defaulting to an unrelated image.
- Delete the dead `capture.cropToId` read in the script (`if (capture.cropToId)` — no entry defines it).

---

## F5: the store now hand-rolls a scheduler; extract it

**Where**: `src/stores/generate-all-store.ts` (537 lines, +78 in this diff).

**Problem**: The polling additions are individually fine (backoff tiers, visibility pause, immediate poll on re-focus — and `getGenerateAllPollDelayMs` as an exported pure helper is good). But the store factory now contains a hand-rolled scheduler: `clearPollTimer` / `removeVisibilityListener` / `stopPolling` / `ensureVisibilityListener` / `schedulePoll`, plus `pollStartedAtRef` assigned in three separate places, all interleaved with queue-diffing and credit domain logic. The lifecycle invariants (listener attached lazily on first schedule, removed only on terminal `stopPolling`, timer suppressed while hidden) are spread across five functions and verified only by reading all of them.

**Code judo**: Extract a small `createVisibilityAwarePoller({ getDelay, poll })` (~40 lines, unit-testable in isolation) exposing `start` / `schedule` / `stop`. The store keeps domain logic only, drops ~60 lines of plumbing, and the next surface that needs visibility-aware polling (workspace status polling is an obvious candidate) reuses it instead of forking the pattern. Also route `pollStartedAtRef` through one setter so the "where does the backoff clock come from" question has one answer.

---

## F6: preview frame chrome copy-pasted between static and live components

**Where**: `src/components/landing/feature-product-preview.tsx` and `feature-product-preview-live.tsx` (new).

**Problem**: The split itself is right (static `next/image` for production, live iframe behind `NEXT_PUBLIC_LANDING_LIVE_PREVIEWS=1` for iterating). But the frame chrome — outer `bg-[#F5F0EB]` padding box, `aspect-[4/3]` bordered/shadowed frame, bottom gradient fade — is duplicated verbatim in both. The next visual tweak to the frame has to be made twice or the dev preview stops matching production, defeating its purpose.

**Fix**: Extract a `PreviewFrame` wrapper (the shared two divs + fade) used by both; each variant supplies only its inner content.

---

## F7: minor hygiene in the changeset

- **`src/components/landing/hero-artwork.tsx:190`**: comment still says "The artwork is display:none below lg" — no longer true; the component now returns `null` below `lg`. Stale comments about lifecycle are how the next person reintroduces the old behavior. Update or delete.
- **`getCurrentUser` adoption** (`src/lib/supabase/current-user.ts`, good addition): call sites now run `await createClient()` *and* `await getCurrentUser()` (which builds its own client internally), so each request constructs two client wrappers. Cheap, but the asymmetry is the smell — either wrap `createClient` in `cache()` too, or have `getCurrentUser` return `{ user, supabase }` so pages make one call. Pick one idiom before more pages copy the current two-call shape.
- **Billing subscription query** (`billing/page.tsx`): changed from `.eq("status", "active")` to `.in("status", ACTIVE_SUBSCRIPTION_STATUSES)` + latest-by-`created_at`. This is a *behavior change* (trialing users now see their plan as current) hiding inside a "server-render the page" refactor — it's the right change and now matches `project-allowance.ts`, but it belongs in the commit message/changelog, not smuggled.

---

## F8: codebase-health audit — file-size boundary (pre-existing, not caused by this diff)

This changeset stayed clean on the 1k-line rule (billing page went 317→~130; the biggest new file is 141 lines). But the audit standard requires flagging the existing stock:

| File | Lines | Note |
|---|---|---|
| `src/components/ui/mockup-renderer.tsx` | 1,503 | Top decomposition candidate |
| `src/components/analysis/product-plan-blocks.tsx` | 1,355 | Split per-section block renderers |
| `src/components/analysis/competitive-analysis-document.tsx` | 1,131 | Same pattern |
| `src/lib/mockups/openrouter-image-pipeline.ts` | 1,113 | Pipeline stages are natural seams |
| `src/components/dev/prompt-lab-client.tsx` | 1,069 | Dev-only; lowest priority |

(`src/types/database.ts` at 1,259 is generated — exempt.) Also: `src/components/workspace/project-workspace.tsx` is 818 lines while PROJECT_CONTEXT.md calls it a "slim orchestrator component" — it is drifting away from its own description and is one more feature away from the 1k boundary. These are ratchets: none should absorb further growth; the next PR touching any of them should decompose first.

---

## Suggested implementation order

1. **F1** — replace the normalization layer with generated types; fix `ProjectAllowanceClient` (isolated, mechanical, high line-count payoff).
2. **F4** — single capture manifest + loud miss (small, kills a silent production failure mode).
3. **F2** — registry-driven section rendering in `scrollable-content.tsx` (removes the `"mvp"` literal as a side effect).
4. **F3** — pending-scroll-target reframe in `use-workspace-scroll-sync.ts` (highest care: verify anchor navigation into contained documents still lands correctly; `scrollable-content.test.tsx` covers some of this).
5. **F5, F6, F7** — extractions and hygiene, in any order.
6. **F8** — do not schedule as its own project; enforce as a ratchet on future PRs.

All recommendations are behavior-preserving except the already-shipped subscription-status widening noted in F7, which should simply be documented.
