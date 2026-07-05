# Plan: Project Dashboard Scroll Sync

## Goal
Remove the visible scrollbar from the left project document rail, preserve a clear visual demarcation between the left rail and right content pane, and make the rail automatically follow the right-side document content as the user scrolls. When the right pane reaches a top-level document section, the matching left rail item should become active and scroll into view inside the rail without stealing scroll focus from the content pane.

## Assumptions
- "Scrollbar on the left" means the visible scrollbar on the `AnchorNav` document rail, not removing its ability to scroll when the rail content exceeds viewport height.
- "Autoscroll to the section" means the left rail should auto-scroll to the active nav item as the right content pane crosses sections during normal user scrolling.
- Removing the rail scrollbar should not remove the visual separation between navigation and content; the left rail needs either a distinct background, a vertical divider, subtle shadow, or a combination that matches the existing dashboard style.
- The existing right-pane scroll container remains the source of truth for active section detection.
- This should not introduce a new dependency or change the workspace data model.
- Mobile behavior should remain horizontally scrollable, but its scrollbar can also be visually hidden for consistency.

## Clarifying Questions
1. Should the left rail auto-scroll only to top-level document cards, or also to the active subsection inside the expanded card?
2. Should URL hash updates continue while the user scrolls, or should hashes update only on explicit nav clicks?
3. On mobile, should the horizontal document rail also auto-scroll to keep the active item visible?
4. Do you prefer the demarcation to be mostly color-based, a crisp vertical divider, or both?

## Recommended First Step
Add a focused test surface for the pure "choose active scroll target" behavior if it can be extracted cheaply; otherwise document the expected red state through a browser/visual check before implementation because this is primarily DOM scroll behavior.

## Plan
1. Confirm existing behavior in `src/components/workspace/project-workspace.tsx`, `src/components/layout/anchor-nav.tsx`, and `src/components/layout/scrollable-content.tsx`.
2. Hide the left rail scrollbar with scoped styling while preserving keyboard, wheel, and touch scrolling.
3. Add a persistent visual boundary between the left rail and right content pane, likely through a slightly different rail background plus a subtle right border on desktop and bottom border on mobile.
4. Add a rail ref and an effect that scrolls the active rail element into view when `activeNavKey` or `activeSectionId` changes due to right-pane user scroll.
5. Improve the active-section calculation if needed so the active section is chosen deterministically from the section nearest the top of the right scroll viewport, rather than whichever `IntersectionObserver` entry happens to arrive first.
6. Keep click navigation behavior smooth and prevent auto-scroll feedback loops during programmatic content scrolling.
7. Verify with lint/typecheck where possible and visual browser checks at desktop and mobile widths.

## Milestones
- Navigation rail scrollbar hidden: the rail still scrolls with wheel/touch/keyboard, but the visible scrollbar track is gone.
- Panel demarcation preserved: the left rail remains visually distinct from the right content pane after the scrollbar is hidden.
- User scroll sync: scrolling the right pane through Overview, Market Research, PRD, MVP, Mockups, and Marketing updates the active rail item.
- Rail auto-scroll: when a deep section becomes active, the left rail moves enough to keep the active item or subsection visible.
- Click navigation preserved: clicking a rail item still scrolls the right pane and updates the URL hash.

## Validation
- Run `npm run lint` for static validation.
- Run `npm run test` if the touched logic gains or affects existing testable helpers.
- Start `npm run dev` and visually test a project dashboard in the browser.
- Confirm at desktop width that the left rail has no visible scrollbar, still scrolls, and follows the active content section.
- Confirm at desktop width that the left rail has a clear boundary or contrasting background against the right content pane.
- Confirm at mobile width that the top rail remains usable and text does not overlap.

## Risks And Mitigations
- Risk: hiding scrollbars can hurt discoverability. Mitigation: preserve all scroll mechanics and only hide chrome on this rail.
- Risk: hiding the scrollbar removes the accidental divider between panels. Mitigation: intentionally add a stable visual boundary with background contrast and/or border treatment.
- Risk: `IntersectionObserver` entry order can make active nav updates jumpy. Mitigation: compute the closest candidate to the right-pane viewport top when observer events fire.
- Risk: auto-scrolling the rail during click-driven smooth scroll can feel noisy. Mitigation: keep the existing programmatic scroll guard for content scrolling and only move the rail to reveal the selected nav item.
- Risk: sections may be deferred or injected after first render. Mitigation: observer setup should tolerate missing subsection anchors and still track top-level `data-section` containers.

## Rollback Or Recovery
Revert the changes in `anchor-nav.tsx` and `project-workspace.tsx`. The existing layout will return to a visible rail scrollbar and current observer-driven active state without data migration or backend rollback.

## Open Decisions
- Subsection auto-scroll is included where subsection anchors exist, with top-level card auto-scroll as the fallback.
- URL hash updates continue while the user scrolls, matching the current workspace behavior.
- Mobile should keep the horizontal rail usable; hide scrollbar styling may apply there too if it does not reduce usability.
- Demarcation style: use a subtly different left rail background plus a restrained divider.

## Implementation Notes
- Approved for implementation on 2026-05-13.
- Implementation branch: `feat/dashboard-scroll-sync`.
- Implemented hidden rail scrollbars with preserved scroll behavior through `.workspace-anchor-nav`.
- Added a distinct rail background and desktop/right divider so the left navigation remains visually separate from the content pane.
- Replaced order-dependent observer updates with a small tested scroll-candidate helper and requestAnimationFrame-backed scroll listener.
- Added rail auto-reveal behavior for active top-level items and visible subsections.
- Updated the rail-follow behavior so the active main left-rail section aligns to the top of the rail when the right content pane reaches one of its sections. Subsections may still be highlighted, but they do not become the rail's top-aligned scroll target.
- Validation completed: focused helper test, full test suite, lint, and production build. Headless dashboard visual inspection was blocked by auth redirect to `/auth?redirect=%2Fdashboard`.

## Critique

### Software Architect
- The change should stay in the workspace shell and nav components. A reusable scroll-sync hook may be worthwhile only if the implementation becomes hard to read; otherwise a small local helper is simpler.

### Product Manager
- The requested behavior reduces visual clutter and helps orientation in long generated documents. The main tradeoff is scrollbar discoverability and panel separation, which is acceptable if the rail still visibly contains clipped content, scrolls naturally, and has an intentional boundary.

### Customer Or End User
- Users should feel the left rail is tracking their place without needing to manage two scroll areas. The nav should still read as a separate control surface after the scrollbar is removed; if the rail jumps too aggressively, it could become distracting, so the scroll-to-active behavior should be minimal and reveal-only.

### Engineering Implementer
- The likely fragile spot is active-section detection. The current observer loops through entries and updates state on every intersecting entry, which can produce order-dependent results. A small deterministic selection step will make the feature less flaky.

### Risk, Security, Or Operations
- No auth, data access, secrets, payment, or backend operations are affected. The main operational risk is a frontend regression in dashboard navigation, so visual verification matters more than a security remediation.
