# Research Format

Use this format for sanitized research summaries derived from interviews, user research, competitor research, surveys, or founder/customer conversations.

## File Naming

```text
docs/research/sanitized/YYYY-MM-DD-short-topic.md
docs/research/processed/YYYY-MM-DD-short-topic.md
docs/research/decisions/YYYY-MM-DD-short-decision.md
```

Use `sanitized/` for cleaned source summaries and `processed/` for higher-level synthesis across one or more sanitized sources.

## Required Metadata

Ask for missing metadata before processing:

- Research date.
- Participant name.
- Research type or topic.
- Any special sensitivity constraints.

## Sanitized Research Template

```md
# Research: Short Topic

Date:
Participant:
Research type:
Sanitization status: Sanitized
Raw source: Not committed

Sanitized from raw transcript. Raw source not committed.

## Summary

## Participant Context

Use only Maker Compass-relevant context. Remove personal details that are not needed for product understanding.

## Key Insights

## Pain Points

## Jobs To Be Done

## Product Opportunities

## Risks / Concerns

## Open Questions

## Linear Follow-Ups

- MC-123: Short issue title

## Related Links

- Related meeting:
- Related decision:
```

## Processing Rules

- Do not store raw transcript content here.
- Do not duplicate Linear task status here.
- Use Linear IDs only as backlinks.
- Keep participant identity only if the user explicitly wants it retained and it is appropriate for the repo audience.
- Use paraphrased evidence instead of raw quotes by default.
