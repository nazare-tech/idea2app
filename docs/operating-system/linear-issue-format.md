# Linear Issue Format

Linear is the source of truth for actionable work. Repo docs should link to Linear issues, not maintain a separate task backlog.

## Instruction Discovery

This file is the canonical Linear workflow for the repository. Root `AGENTS.md` (Codex) and root `CLAUDE.md` (Claude) must both require reading it before any Linear create, update, close, or evidence action. Keep the detailed workflow here instead of duplicating it in platform-specific skills, so both agent runtimes follow one maintained source of truth.

## Issue Body Template

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

## Label Taxonomy

Use labels to describe source, product area, type, and special risk. Do not use labels for status, assignee, cycle, due date, or priority when Linear has native fields for those.

### Source Labels

```text
source:research
source:meeting
source:customer
source:internal
source:slack
```

### Area Labels

```text
area:onboarding
area:workspace
area:generation
area:market-research
area:product-plan
area:first-version-plan
area:mockups
area:prompt-lab
area:billing
area:auth
area:landing
area:infra
```

### Type Labels

The Linear workspace already has these canonical labels:

```text
Feature
Improvement
Bug
```

Use these additional type labels when the existing labels are not specific enough:

```text
type:ux
type:tech-debt
type:decision-followup
type:investigation
type:experiment
```

### Risk Labels

```text
risk:privacy
risk:security
risk:revenue
risk:stability
```

## Labeling Guidance

- Every transcript-derived issue should have exactly one `source:*` label.
- Add one or more `area:*` labels when the product surface is clear.
- Add one work-type label such as `Feature`, `Improvement`, `Bug`, or one `type:*` label.
- Add `risk:*` labels only when the risk is materially relevant.
- Use `source:slack` only when Slack is the source of the issue. Do not use Slack as the task tracker.

## Visual Evidence In Comments

When a completed ticket needs screenshot or video evidence, make the evidence visible inside the verification comment instead of mentioning only the filename.

1. Save the local artifact under the ticket-specific `ui-evidence/` folder.
2. Call Linear's `prepare_attachment_upload` with the exact filename, MIME type, and byte size.
3. Immediately upload the raw bytes with `PUT`, preserving every signed request header exactly.
4. Call `create_attachment_from_upload` with the returned `assetUrl` so the file remains attached to the issue.
5. Add or update the verification comment with standard Markdown image syntax using that same Linear-hosted `assetUrl`:

```md
![NAZ-123 verification screenshot](https://uploads.linear.app/...)
```

6. Read the comment back and verify that it contains the inline image embed. Keep the issue attachment as a durable fallback, but do not use `Attached: filename.png` as the only visual reference.
7. For videos or file types Linear cannot render inline, attach the file and include a direct descriptive link in the comment.

Upload and finalize one file at a time because signed upload URLs expire quickly. Never paste base64 image data into a Linear comment or expose credentials, payment details, private email addresses, or unrelated customer/project content in evidence.
