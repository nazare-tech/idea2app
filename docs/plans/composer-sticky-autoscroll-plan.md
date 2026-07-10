---
implemented: true
implemented_at: 2026-07-09
implementation_summary: >
  Sticky autoscroll added to ProjectComposer. Autoscroll now assigns
  scrollTop synchronously in the effect (removed requestAnimationFrame,
  which is suspended in background tabs). A wheel listener pauses
  autoscroll on wheel-up and resumes on wheel-down that lands near the
  bottom; a scroll listener handles scrollbar drags via direction
  detection and near-bottom re-stick. Sending a new message always
  re-sticks. Verified live in Chrome against streaming responses:
  pinned during stream, held position after scroll-up while content
  grew, resumed after scroll-down. Document view unchanged (it has no
  autoscroll code).
---

# Composer Sticky Autoscroll Plan

## Goal
While a composer response streams in, the conversation panel should auto-scroll to the newest content, but stop the moment the user scrolls up to read earlier text. Autoscroll resumes when the user scrolls back to the bottom or sends a new message. The document view keeps its current behavior: no autoscroll at all during streaming.

## Assumptions
- Only `src/components/workspace/project-composer.tsx` changes. Verified by grep: the document view has no streaming autoscroll code, so its requirement ("stay where I am unless I scroll") is already met.
- The current unconditional autoscroll lives in the `useEffect` at project-composer.tsx:106-113, firing on every `messages`/`streaming` change (every streamed chunk).

## Clarifying Questions
**Q: How should "user scrolled away" be detected?**
- **A (Selected): Distance-from-bottom threshold on the panel's scroll event.** If `scrollHeight - scrollTop - clientHeight` exceeds ~48px, mark unstuck; within threshold, mark stuck. Simple, no event-source disambiguation needed, and programmatic scrolls land at the bottom so they self-classify as stuck.
  - Trade-off: a programmatic scroll event and a user scroll event look identical, but since programmatic scrolls always end at the bottom, misclassification cannot occur in practice.
- **B: Listen for `wheel`/`touchmove`/keyboard events to detect user intent explicitly.** More precise attribution but more listeners, misses scrollbar drags, and adds complexity for no behavioral difference.

**Q: When does autoscroll re-engage?**
- **A (Selected): When the user scrolls back to within the bottom threshold, and always when the user sends a new message.** Matches the stated requirement and standard chat UX.
- **B: Only on new user message.** Would strand the user in manual mode after they return to the bottom mid-stream; rejected.

## Architecture Improvement Opportunities
None warranted. The sticky flag is a single ref plus one scroll listener; extracting a `useStickToBottom` hook would be premature for one consumer.

## Plan
### Phase 1: Sticky flag
- Add `stickToBottomRef = useRef(true)` in `ProjectComposer`.
- Add a scroll listener effect on `panelRef` that sets the ref based on the 48px bottom threshold.

### Phase 2: Gate the autoscroll
- In the existing autoscroll effect, bail out when `stickToBottomRef.current` is false.
- In `send()`, reset `stickToBottomRef.current = true` so a new question always snaps to the latest exchange.

## Milestones
1. Composer autoscrolls during streaming when at the bottom (existing behavior preserved).
2. Scrolling up mid-stream halts autoscroll; position holds while tokens keep arriving.
3. Scrolling back to the bottom, or sending a new message, resumes autoscroll.

## Validation
- Run dev server, open a project, ask the composer a question, scroll up mid-stream, confirm position holds; scroll back down, confirm re-stick. Browser evidence via preview tools.
- Confirm document view is untouched (no diff outside the composer file).

## Risks
- Rounding: `scrollTop` can be fractional; the 48px threshold absorbs it.
- `requestAnimationFrame` in the autoscroll races the scroll listener; checking the ref inside the rAF callback (not before scheduling) avoids acting on a stale value.

## Rollback
Revert the single-file change to `project-composer.tsx`.

## Open Decisions
None.

## Implementation Notes (what changed from the plan)
Live testing against real streaming responses surfaced two races the original distance-threshold design missed:
1. A scroll event from a programmatic (autoscroll) scroll can be handled after new streamed content has grown the panel, so a pure distance check unsticks spuriously. Fixed by only unsticking when scrollTop decreases.
2. The reverse: during fast streaming, a render can move the panel between a user gesture and its coalesced scroll event, so the event misreads intent in both directions. Fixed with a wheel listener: wheel-up pauses immediately; wheel-down that would land within the threshold of the bottom resumes immediately.
Also removed the requestAnimationFrame wrapper around the autoscroll: the DOM is already committed when the effect runs, and rAF callbacks are fully suspended in background tabs, which would freeze autoscroll there.

## Critique (five perspectives)
- **User:** Matches the exact complaint; standard chat sticky-scroll pattern, no surprises.
- **Maintainer:** One ref, one listener, comments explain the threshold; low surface.
- **QA:** Manual browser validation covers the three milestones; no unit test practical for scroll physics in jsdom.
- **Performance:** Passive scroll listener, no state updates on scroll (ref only), so no re-renders per scroll frame.
- **Security:** No new inputs or network surface.
