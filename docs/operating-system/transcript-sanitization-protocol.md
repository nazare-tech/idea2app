# Transcript Sanitization Protocol

Use this protocol whenever the user provides a raw research transcript, meeting transcript, call recording transcript, pasted notes, or any similar source material.

## Non-Negotiable Rule

Raw transcripts are not project artifacts. They are temporary private inputs. Only sanitized, Maker Compass-relevant outputs may be written to the repo, Linear, or Slack.

## Intake Questions

Before processing, ask for any missing metadata:

- When did the research or meeting happen?
- For research transcripts: who was the participant? Ask for the participant name.
- For meeting transcripts: what was the meeting title or topic, and who attended?
- Is there any special sensitivity level beyond the default public-safe sanitization?

Default to public-safe sanitization unless the user gives a different retention or audience instruction.

## Allowed Permanent Outputs

The only approved permanent outputs are:

- Sanitized research summaries under `docs/research/sanitized/` or `docs/research/processed/`.
- Sanitized meeting notes under `docs/meetings/sanitized/`.
- Sanitized decision records under `docs/research/decisions/` or `docs/meetings/decisions/`.
- Linear issues containing sanitized context and links to sanitized repo docs.
- Slack messages containing short sanitized summaries or links only.

## Private Raw Storage

If raw transcript files need to exist locally, place them under:

```text
.private/raw-transcripts/research/
.private/raw-transcripts/meetings/
```

The `.private/` directory is ignored by git. Do not force-add raw transcript files.

## Sanitization Checklist

Remove or rewrite the following before anything leaves the raw transcript:

- Small talk unless it directly affects Maker Compass product context.
- Risque, embarrassing, personal, or off-topic remarks.
- Emails, phone numbers, addresses, account IDs, private URLs, credentials, tokens, secrets, and signed links.
- Personal medical, legal, financial, family, relationship, or HR details.
- Customer, company, or vendor-confidential details that are not necessary for the product insight.
- Names by default. Replace with roles such as `Founder`, `Engineer`, `Designer`, `Customer A`, or `Research Participant`.
- Long verbatim quotes. Prefer paraphrased evidence.

Keep the following when relevant:

- Product pain points.
- User goals and objections.
- Feature requests.
- Workflow breakdowns.
- Decisions.
- Risks and concerns.
- Open questions.
- Follow-up actions.
- Evidence that explains why a Linear issue exists.

## Evidence Rule

Preserve meaning, not raw wording. Use paraphrased evidence by default. Only keep a short direct quote when it is safe, anonymized, and materially more useful than a paraphrase.

## Linear Rule

Never paste raw transcript excerpts into Linear. Linear issues should contain:

- A sanitized source link.
- A short problem statement.
- Sanitized evidence.
- Proposed action.
- Acceptance criteria.
- Non-goals when useful.

## Linear Coverage Audit

Before calling the research processing complete, create a line-item coverage audit from the user's notes and the sanitized transcript insights.

For each distinct product-relevant note or insight, record one disposition:

- `existing issue`: the specific Linear issue already covers it.
- `new issue`: a new Linear issue was created for it.
- `updated issue`: an existing Linear issue was updated because it only partially covered the point.
- `synthesis only`: the point is useful context but not actionable enough for Linear yet.
- `not product-relevant`: the point was intentionally excluded after sanitization.

Do not treat a broad theme as covered unless the issue title or acceptance criteria would clearly remind a future implementer of that specific point. If the point is only implied, either update the issue or create a smaller follow-up ticket.

When the task is medium or larger and subagents are available, run a second-pass coverage audit with a subagent before finalizing Linear work. The second pass should look specifically for:

- Notes that were compressed into themes too early.
- Open questions that deserve investigation tickets.
- Positive signals that should become guardrails for future design or prompt changes.
- Product ideas that should be marked as exploration rather than implementation.

Add a `Linear Coverage` section to the sanitized artifact when useful. It should list the created or matched issue IDs and any `synthesis only` decisions that might otherwise look like omissions.

## Slack Rule

Slack is not the backlog. If a Slack update is needed, post a short sanitized summary and link to Linear or sanitized docs. Do not post raw transcript excerpts.

## Final Review Before Saving

Before writing a sanitized artifact or creating Linear issues, check:

- Does this contain any raw PII?
- Does this contain unnecessary personal or sensitive content?
- Is every included detail relevant to Maker Compass?
- Are action items tracked in Linear instead of duplicated in docs?
- Does the sanitized artifact link to Linear issue IDs after issue creation?
- Has every distinct product-relevant note or insight received a Linear coverage disposition?
- Did a second-pass audit run for medium or larger research tasks when subagents were available?

Add this note to sanitized artifacts:

```text
Sanitized from raw transcript. Raw source not committed.
```
