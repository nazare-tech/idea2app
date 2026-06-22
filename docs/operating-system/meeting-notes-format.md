# Meeting Notes Format

Use this format for sanitized team meetings, product syncs, engineering reviews, planning sessions, customer debriefs, and decision meetings.

## File Naming

```text
docs/meetings/sanitized/YYYY-MM-DD-short-topic.md
docs/meetings/decisions/YYYY-MM-DD-short-decision.md
```

## Required Metadata

Ask for missing metadata before processing:

- Meeting date.
- Meeting title or topic.
- Attendees.
- Any special sensitivity constraints.

## Sanitized Meeting Template

```md
# Meeting: Short Topic

Date:
Type: Product / Engineering / Research / Customer / Ops
Attendees:
Sanitization status: Sanitized
Raw source: Not committed

Sanitized from raw transcript. Raw source not committed.

## Summary

## Decisions

## Discussion By Topic

### Topic

## Risks / Concerns

## Open Questions

## Linear Follow-Ups

- MC-123: Short issue title

## Related Links

- Related research:
- Related decision:
- Related Linear project:
```

## Processing Rules

- Remove small talk, personal comments, and off-topic remarks.
- Keep the decisions, tradeoffs, unresolved questions, and Maker Compass-relevant context.
- Do not duplicate Linear status in the meeting note.
- After creating Linear issues, add only issue IDs and short titles under `Linear Follow-Ups`.
- If a meeting contains a real decision, create a separate decision record in `docs/meetings/decisions/`.
