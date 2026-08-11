# Issue Tracker Format
The configured issue tracker is the source of truth for actionable work, owners, status, priority, due dates, and acceptance criteria; repo docs link to issues instead of keeping a parallel backlog.
Canonical issue body template: Source, Problem/Context, Sanitized Evidence, Proposed Action, Acceptance Criteria, Non-Goals, Notes; paraphrased evidence only, never raw transcript text.
Label taxonomy covers source, product area, work type, and risk; native tracker fields own status, assignee, cycle, due date, and priority, so labels never duplicate them.
Completion evidence is embedded inline in the verification comment using the tracker's own hosted asset URL, with the file also attached as a durable fallback.
Upload flow: save the artifact locally, request an upload slot, PUT the raw bytes with every signed header preserved, finalize the attachment, then embed the returned asset URL.
Read the saved comment back and confirm the inline embed rendered; "Attached: filename.png" alone is not acceptable completion evidence.
---

## Instruction discovery

This file is the canonical issue-tracker workflow for the repository. Root `AGENTS.md` (and any runtime-specific entrypoint such as `CLAUDE.md`) must require reading it before any issue create, update, close, or evidence action. Keep the detailed workflow here instead of duplicating it in platform-specific skills, so every agent runtime follows one maintained source of truth.

If this project has no issue tracker, delete this file and name the repository file that owns task state in `PROJECT_CONTEXT.md`. Do not let chat threads become the backlog.

## Issue body template

```md
## Source

Research:
Meeting:
Decision:

## Problem / Context

## Sanitized Evidence

Paraphrased evidence only. Do not paste raw transcript excerpts.

## Proposed Action

## Acceptance Criteria

- [ ]

## Non-Goals

## Notes
```

## Label taxonomy

Use labels to describe source, product area, type, and special risk. Do not use labels for status, assignee, cycle, due date, or priority when the tracker has native fields for those.

### Source labels

```text
source:research
source:meeting
source:customer
source:internal
source:chat
```

### Area labels

```text
area:{{SURFACE}}
area:{{SURFACE}}
area:auth
area:billing
area:infra
```

Replace the placeholders with this project's real surfaces, one label per surface a user would name.

### Type labels

Use the tracker's built-in work types first (commonly `Feature`, `Improvement`, `Bug`). Add these only when the built-ins are not specific enough:

```text
type:ux
type:tech-debt
type:decision-followup
type:investigation
type:experiment
```

### Risk labels

```text
risk:privacy
risk:security
risk:revenue
risk:stability
```

## Labeling guidance

- Every transcript-derived issue gets exactly one `source:*` label.
- Add one or more `area:*` labels when the product surface is clear.
- Add one work-type label.
- Add `risk:*` labels only when the risk is materially relevant.

## Visual evidence in comments

When a completed ticket needs screenshot or video evidence, make the evidence visible inside the verification comment instead of mentioning only the filename.

1. Save the local artifact under the ticket-specific `ui-evidence/` folder (see `docs/operating-system/ui-verification.md`).
2. Request an upload slot from the tracker's API with the exact filename, MIME type, and byte size.
3. Immediately upload the raw bytes with `PUT`, preserving every signed request header exactly.
4. Finalize the attachment with the returned asset URL so the file stays attached to the issue.
5. Add or update the verification comment with standard Markdown image syntax using that same tracker-hosted asset URL:

```md
![{{ISSUE-KEY}} verification screenshot](https://{{TRACKER-ASSET-HOST}}/...)
```

6. Read the comment back and verify it contains the inline image embed. Keep the attachment as a durable fallback, but never use `Attached: filename.png` as the only visual reference.
7. For videos or file types the tracker cannot render inline, attach the file and include a direct descriptive link in the comment.

Upload and finalize one file at a time; signed upload URLs expire quickly. Never paste base64 image data into a comment or expose credentials, payment details, private email addresses, or unrelated customer content in evidence.
