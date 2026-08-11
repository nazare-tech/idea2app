# {{System Name}}
{{Summary line 1: what this system is and the single most important fact about it, with the real path/table/route names an agent would grep for.}}
{{Summary line 2: the main flow or lifecycle, named entry points, and where the durable state lives.}}
{{Summary line 3: the contracts this system owns and who consumes them.}}
{{Summary line 4: the failure modes, limits, timeouts, or quotas that matter in practice.}}
{{Summary line 5: the security or ownership rule that governs access here.}}
{{Summary line 6: related docs, the code paths that implement this, and anything commonly mistaken about it.}}
---

## How to use this template

Copy to `docs/systems/<system>.md`, replace the six header lines with dense one-line facts (roughly 100-160 characters each, complete sentences, packed with grep bait: file paths, table names, route paths, contract names), then write the body. Delete this section. Add a row to the `PROJECT_CONTEXT.md` index in the same commit.

The header exists for two readers: `head -7` ("does this doc cover what I need?") and `grep -ril <keyword> docs/` ("which doc mentions it?"). No marketing language, no "this document describes". State facts.

## {{Section: the main structure, flow, or reference table}}

{{Body. Prefer tables and named identifiers over prose. Link to code paths rather than pasting code.}}

## {{Section: contracts and invariants}}

{{What other systems may rely on, what must never change silently, what versioning applies.}}

## {{Section: failure, recovery, and limits}}

{{Timeouts, retries, idempotency, partial/duplicate/stale behavior, rollback path, kill switch.}}

## {{Section: security and ownership}}

{{Trust boundary, how verified identity determines access, what is never client-authoritative, secret storage.}}

## Related

- {{Other system docs, plans, or review artifacts that touch this system.}}
