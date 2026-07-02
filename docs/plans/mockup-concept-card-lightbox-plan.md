---
implemented: true
implemented_at: 2026-07-01T19:23:56Z
implementation_summary: Unified OpenRouter storyboard mockup cards under Concept labels and added image lightbox viewing with tested close behavior.
---

# Plan: Mockup Concept Card Lightbox

## Goal
Render Design Mockups as one unified card per concept: the concept metadata, image, rationale, screen captions, and export action live together. Clicking a mockup image opens a lightbox with a top-right close button and a zoom cursor on hover. Visible labels should align with the sidebar anchors: Concept 1, Concept 2, and Concept 3 instead of Option A, Option B, and Option C.

## Assumptions
- This change applies to the current OpenRouter storyboard mockup renderer in `src/components/ui/mockup-renderer.tsx`.
- Stored option labels A/B/C can remain in data and filenames; only user-facing card labels change to Concept 1/2/3.
- No backend, database, or historical data migration is needed.

## Clarifying Questions
1. Should the image stay visually connected to the rationale card or remain in a separate image panel?
   - Recommendation A: Move the image into the existing concept detail card and remove the repeated top header/panel.
   - Trade-off: Best matches the requested hierarchy, with a slightly taller card.
   - Recommendation B: Keep a separate image panel but hide the duplicate heading.
   - Trade-off: Less layout churn, but still preserves the split-card feel the user called out.
   - Selected: Recommendation A, because the user explicitly asked to keep the lower card and include the image inside it.
2. Should labels be converted only in the card body or everywhere in the OpenRouter storyboard viewer?
   - Recommendation A: Convert visible labels in the OpenRouter storyboard card and placeholders to Concept 1/2/3 while preserving A/B/C internally for downloads and data lookup.
   - Trade-off: Clean user-facing consistency without changing storage contracts.
   - Recommendation B: Convert stored/generated labels from A/B/C to 1/2/3.
   - Trade-off: More complete naming change, but creates unnecessary data-shape risk.
   - Selected: Recommendation A, because no backwards-compatible data migration is needed and the user asked for visible card/sidebar consistency.

## Recommended First Step
Update the focused renderer tests to assert concept labels and the absence of visible Option labels in the OpenRouter storyboard card.

## Plan
1. Update `src/components/ui/mockup-renderer.test.tsx` with expectations for Concept labels, image zoom button affordance, and missing-option placeholders.
2. Refactor `OpenRouterImageMockupViewer` in `src/components/ui/mockup-renderer.tsx` so each ready concept has one card with header, export action, image button, rationale, and screen captions.
3. Add a lightweight lightbox state to the OpenRouter image viewer with a fixed overlay, full-size contained image, top-right close button, backdrop close, and Escape key close.
4. Run focused tests and lint.
5. Verify in the real local UI at the project mockups route and capture screenshot evidence for the unified card and open lightbox.

## Milestones
- Renderer contract: focused mockup renderer tests pass.
- UI behavior: image hover/click opens a lightbox and close button dismisses it.
- Visual evidence: screenshots saved under `ui-evidence/`.

## Validation
- `npm test -- src/components/ui/mockup-renderer.test.tsx`
- `npm run lint`
- In-app browser verification on `http://localhost:3000/projects/57ae8c53-0e68-423e-a090-27ccfd03416f-signal-to-roadmap?tab=mockups#mockups-concept-1`.

## Risks And Mitigations
- Risk: Changing visible labels could break internal option lookup.
  - Mitigation: Keep `option.label` unchanged for maps, keys, and downloads; derive display labels from render index.
- Risk: Lightbox could trap or obscure UI awkwardly.
  - Mitigation: Include an explicit close button, backdrop close, Escape handling, and `aria-modal`.
- Risk: Existing tests are static-render tests and cannot prove click behavior.
  - Mitigation: Add static affordance assertions and verify the interaction through the real browser.

## Rollback Or Recovery
Revert `src/components/ui/mockup-renderer.tsx` and its focused test updates. No data or backend state changes are involved.

## Open Decisions
None.

## Critique

### Software Architect
- The change should stay inside the OpenRouter image viewer, because the old Stitch/json-render paths have separate contracts and the user-selected UI is OpenRouter storyboard output.

### Product Manager
- Concept labels reduce cognitive mismatch between the left nav and the content cards. Keeping A/B/C only as internal implementation detail avoids surfacing generation vocabulary.

### Customer Or End User
- The lightbox is valuable only if the image remains easy to inspect. A zoom cursor and full-viewport contained image make the affordance discoverable without adding explanatory text.

### Engineering Implementer
- The main implementation risk is duplicating title/label markup across ready and placeholder states. Use a small helper for the concept label to keep both paths aligned.

### Risk, Security, Or Operations
- This is client-side rendering only. No secrets, auth boundaries, RLS, persistence, or external API calls change.
