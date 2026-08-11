# Operating System
This folder defines how agents work in this repository: planning, verification, review, documentation conventions, and how raw inputs become durable artifacts.
Workflow docs: planning-workflow.md (plan/review artifacts), brand-foundation.md (early product identity), ui-verification.md (real-flow evidence), review-personas.md (cross-model review), doc-conventions.md (7-line headers).
Intake docs: transcript-sanitization-protocol.md plus research-template.md and meeting-template.md turn private transcripts into sanitized, committable summaries.
Delivery docs: issue-tracker-format.md keeps actionable work in one tracker; product-analytics-template.md keeps user-visible features observable without collecting content or PII.
Raw transcripts are temporary private inputs, never project artifacts; only sanitized summaries, decisions, and issue links are stored.
Every non-template doc here follows the 7-line greppable header convention so `head -7 docs/operating-system/*.md` skims the whole operating system in one screen.
---

## Source of truth

- Raw transcripts are private inputs only. Do not commit them, copy them into the issue tracker, or post them to chat.
- `docs/research/` stores sanitized research summaries and research-driven decisions.
- `docs/meetings/` stores sanitized meeting notes and meeting-driven decisions.
- The configured issue tracker is the source of truth for actionable work, owners, priority, status, due dates, and acceptance criteria. If there is no tracker, name the repository task file that owns this state in `PROJECT_CONTEXT.md`.
- Chat is for discussion and notifications. Link to the tracker or sanitized repo docs instead of storing tasks there.

## Required protocols

| Task | Read first |
|---|---|
| Substantial feature, refactor, bug fix, architecture work | `planning-workflow.md` |
| New product/company idea or first brand direction | `brand-foundation.md` |
| UI, visual, user-flow, or user-visible backend change | `ui-verification.md` |
| Committing, wrap-up review, second opinion on a diff | `review-personas.md` |
| Writing or updating any doc under `docs/systems/` | `doc-conventions.md` |
| Handling a raw research or meeting transcript | `transcript-sanitization-protocol.md`, then `research-template.md` or `meeting-template.md` |
| Extracting action items into the tracker, attaching evidence | `issue-tracker-format.md` |
| Planning or reviewing a user-visible feature, entitlement, funnel, or lifecycle transition | `product-analytics-template.md` |

## Intake rule

When a raw transcript is provided, ask for missing metadata before processing:

- When did this research or meeting happen?
- For research: who was the participant?
- For meetings: what was the meeting title or topic, and who attended?

If the user already provided the metadata, proceed without asking again.
