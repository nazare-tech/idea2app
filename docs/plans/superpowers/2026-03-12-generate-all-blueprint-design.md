# Generate All Blueprint — Design Spec

**Date:** 2026-03-12
**Status:** Approved
**Model:** Gemini 3.1 Pro Preview (`google/gemini-3.1-pro-preview`)

---

## Problem

After the AI summarizes a user's idea in the "Explain the idea" tab, there is no guided path to generate all artifacts. Users must navigate to each tab manually and click Generate one-by-one, often unsure of the right order.

## Solution

An inline confirmation dialog appears below the summary in the chat, showing:
- What will be generated (Competitive Research, PRD, MVP Plan, Tech Spec, Mockups)
- Estimated credit cost upfront
- Accept / Dismiss buttons

After accepting, the dialog transforms into a live progress tracker showing per-artifact status. The DocumentNav sidebar badges update in parallel via the existing `generatingDocuments` state.

---

## Dialog Copy

**Title:** "Your idea is ready — generate your full business blueprint"

**Body:** "We'll create 5 documents to take your idea further: Competitive Research, PRD, MVP Plan, Tech Spec, and Mockups."

**Credit line:** "Estimated cost: ~{N} credits" (amber warning if insufficient)

**Buttons:** "Generate All — {N} credits" | "I'll do it manually"

---

## Progress Tracker (replaces dialog after accept)

Each artifact shows one of:
- Queued (grey dot)
- Generating... (animated spinner)
- Done (green checkmark, clickable link to that tab)
- Failed — Retry (red X + retry button)

Progress bar: "{n} of 5 complete"

When all done: "Blueprint complete!" with CTA to first artifact.

---

## Visibility Rules

- Show when: `project.description` exists AND no artifacts generated yet AND not dismissed this session
- Dismiss ("I'll do it manually"): hides for the current browser session
- Permanent hide: any artifact generated from its individual tab sets `hasAnyArtifact = true`
- After accepting: dialog transforms to progress tracker (stays visible until all done)

---

## Orchestration

**Approach:** Frontend-sequential (reuses all existing API endpoints)

**Sequence:** competitive → prd → mvp → techspec → mockups
(respects prerequisite chain already enforced by the backend)

**Credit check:** Upfront balance check before starting; toast error if insufficient.

**Error handling:** Per-artifact error state with Retry button; continues remaining artifacts on error.

---

## Credit Costs (Gemini 3.1 Pro, 1.25× multiplier)

| Artifact | Base | With 1.25× | Ceiled |
|----------|------|-----------|--------|
| Competitive Research | 5 | 6.25 | 7 |
| PRD | 10 | 12.5 | 13 |
| MVP Plan | 10 | 12.5 | 13 |
| Tech Spec | 10 | 12.5 | 13 |
| Mockups | 15 | 18.75 | 19 |
| **Total** | | | **65** |

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/token-economics.ts` | Add `calculateGenerateAllCost`, `GENERATE_ALL_ARTIFACTS` |
| `src/components/chat/generate-all-dialog.tsx` | New component — dialog + progress tracker |
| `src/components/workspace/project-workspace.tsx` | Add state, `handleGenerateAll`, modify `handleGenerateContent` |
| `src/components/layout/content-editor.tsx` | Thread generate-all props to `PromptChatInterface` |
| `src/components/chat/prompt-chat-interface.tsx` | Add props, render `GenerateAllDialog` |
