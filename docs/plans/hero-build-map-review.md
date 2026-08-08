# Hero Build Map — review artifact
Verification, self-review, and architecture-improvement review for docs/plans/hero-build-map-plan.md (hero artwork swapped from HeroReelArc to the design v2 build map).
Cross-model plan evaluation ran and all six findings were folded in; commits are not separately cross-model reviewed in this repo.
Gate: npm run lint (new files clean), npm run typecheck, npm test 685/685, npm run build including the chunk guard.
Real-browser evidence: ui-evidence/2026-07-29/hero-build-map/ at 1440x900, 1024x900, and 390x844, plus a reduced-motion run.
No auth, RLS, webhook, billing, or migration surface, so no on-demand cross-model diff review was requested.
Blocked: the waitlist variant of the hero could not be reached without doctoring WAITLIST_LIMIT, so it is reported unverified rather than faked.
---

## What changed

| File | Change |
|---|---|
| `src/lib/landing-hero-build-map.ts` | New. Both canvases (wide 1760x760, tall 800x1700) as connector paths, joints, and node placements in canvas percentages; three cycling scenarios; cycle timing; node labels. |
| `src/components/landing/hero-build-map.tsx` | New. Renders both variants from one renderer per node, and owns the scenario cycle in a single effect. |
| `src/components/landing/hero-build-map.test.tsx` | New. Six tests: both variants, server-side first scenario, decorative markup, mockups on disk, layout completeness, scenario completeness. |
| `src/app/page.tsx` | `HeroReelArc` → `HeroBuildMap`; hero padding switched to the design's clamps; `min-h` reservation dropped. |
| `src/app/globals.css` | Four `hero-node-*` keyframes and utility classes, the tall variant's sub-640px label stacking, and reduced-motion entries. |
| `docs/systems/directories-and-key-files.md`, `docs/testing/test-inventory.md` | Self-healing doc updates: build map is the active hero artwork, reel is retained-but-inactive, new test listed. |
| `docs/design-imports/maker-compass-landing-v2.dc.html` | The design export the implementation was taken from, committed for provenance (sha256 in the plan). |

## Verification run

Chrome extension bridge was not connected this session (`list_connected_browsers` returned empty, Chrome not running), so verification ran in **real Google Chrome via Playwright's `chrome` channel**, headed, against the long-lived local `next dev` on port 3000. That is a deviation from the documented default of the claude-in-chrome MCP path, but not from the "real Chrome, real dev server" requirement: no fixtures, no stubs, no route patches. The dev server is left running per dev-server discipline.

| Case | Result |
|---|---|
| 1440x900, motion on | 5 live nodes with real boxes (244x114 … 342x179); full scenario swap observed: idea line retyped, competitors → Squire/Booksy/Fresha, persona → Dre Lawson / Shop Owner, files → `chairbook-brief.md`, mockup → option B; all four panels back to opacity 1; 0 console errors. |
| 390x844, motion on | 5 live nodes (tall variant), swap observed with the same content set, labels stacked, 0 console errors. |
| 1024x900 | Artwork renders with no clipped copy; connectors meet their joints. |
| 1440x900, `prefers-reduced-motion: reduce` | Scenario 1 static, panels already at opacity 1, no typing/clear observed across a 14s window, 0 console errors. |
| Overflow audit at 390, 430, 768, 1024, 1280, 1440, 1920 | `ok` at every width after the D6 fix. |

Artifacts: `desktop-1440-01-initial.png`, `desktop-1440-02-after-swap.png`, `mobile-390-01-initial.png`, `mobile-390-02-after-swap.png`, `mobile-390-artwork.png`, `desktop-1024-artwork.png`, `desktop-1440-reduced-01-initial.png`, `verification.json`.

### Defect found and fixed during verification

The first pass shipped the design's fixed-pixel internal sizing and **clipped copy mid-glyph** in the Idea and Prompt nodes at 390, 430, 1024, and 1280px. Found by measuring `scrollHeight - clientHeight` per node across seven widths, not by eye. Fixed per plan decision D6: each node is now its own container-query context and internal lengths are shares of the node's own width, anchored so the 1760px reference rendering is unchanged. Re-audited clean at all seven widths.

Second, smaller correction: the hero's vertical padding was first approximated with Tailwind breakpoint steps and is now the design's `clamp(48px, 7svh, 92px)` / `clamp(24px, 3vw, 40px)`, which keeps more of the map above the fold on short screens.

## Self-review of the finished diff

- **Loop lifecycle.** The async cycle checks its `stale` flag after every `await`, including inside the per-character typing loop, and every `setTimeout` is tracked in a `Set` that cleanup clears — including the staggered reveal timers, which also re-check the flag before writing. Unmount and reduced-motion restarts both retire the previous run before starting another.
- **No React state per frame.** The cycle writes `textContent` and `style.opacity` directly; nothing re-renders. Scoped through a root ref, so a second instance could not cross-write.
- **Both variants share one renderer**, so copy cannot drift between desktop and mobile; the tests assert every label and every scenario field appears exactly twice.
- **Server-rendered first frame is real content**, not an empty shell: a no-JS or reduced-motion visitor reads scenario 1 with panels already revealed.
- **Honest tokens.** Design hexes map to existing repo tokens; the three shades with no token (`#EFE7E0`, `#FCFAF8`, `#F0E9E2`) are named constants with a comment, matching how the feature stage handles its one-off.
- **Remaining wart:** `page.tsx` still imports nothing from `hero-reel-arc.tsx`, which stays on disk unreferenced by explicit user decision. A comment at the swap site says so, and both doc files now describe it as retained-but-inactive, so it should not read as an oversight.
- **Not covered:** the waitlist hero. `isWaitlistMode` compares the live profile count against the hard-coded `WAITLIST_LIMIT = 200`; reaching it locally would mean editing that constant or seeding 200 profiles, and editing it is exactly the patched state the UI rules forbid as evidence. The artwork sits outside that branch and the branch is untouched by this diff, so the residual risk is limited to the shared hero padding, which is covered on the non-waitlist path.

## Architecture improvement review

- **Selected, landed:** layout data in a typed module (`landing-hero-build-map.ts`), and one shared renderer per node across both variants. Both are load-bearing rather than decorative: the D6 fix was a change to one helper plus its call sites precisely because geometry and content each live in exactly one place, and `REFERENCE_NODE_WIDTH` is derived from the layout data so it cannot drift from it.
- **Deferred, still deferred:** a shared `usePrefersReducedMotion` hook (three landing components now read that query inline; folding it in here would widen the diff into untouched files) and a `<PaperStack>` primitive shared with the workspace blocks (still not the same motif twice).
- **Rejected, still rejected:** IO-gating the cycle when off screen, and self-hosting competitor favicons.
- **New duplication introduced:** none found. The favicon `<img>` pattern now appears in two landing components; it is six lines with a shared justification comment in both, and extracting it would couple the hero artwork to the feature stage for no behavioral gain.
- **Contracts, idempotency, authorization, recovery:** no new contracts, no persistence, no trust boundary, nothing to recover. The one external dependency (the favicon host) degrades to an empty 18px box beside a legible name.

## Follow-ups

- If the map reads as too dense between 1024 and 1280px in real use, the honest fix is showing fewer nodes at those widths, not shrinking type further; the layout data makes that a data change.
- Whenever the waitlist threshold is genuinely crossed, re-check the hero padding against the waitlist form.
