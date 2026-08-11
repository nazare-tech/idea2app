# Transcript Sanitization Protocol
Rules for turning raw research and meeting transcripts into sanitized, committable summaries; raw transcripts are temporary private inputs and never project artifacts.
Intake requires date, participant or attendee metadata, intended audience, and sensitivity before any processing begins; ask for what is missing first.
Sanitization removes names, contact details, employer identifiers, credentials, and verbatim quotes that could identify a person, keeping paraphrased evidence only.
Durable outputs go to docs/research/ and docs/meetings/ using research-template.md or meeting-template.md; action items go to the issue tracker, not chat threads.
Never commit raw transcripts, paste them into issues, or forward them; approved local raw storage lives in an ignored path such as .private/raw-transcripts/ under the agreed retention policy.
Related: docs/operating-system/README.md (intake rule), issue-tracker-format.md (sanitized evidence in issue bodies).
---

## Intake

Before processing, obtain missing metadata:

- Date/time of research or meeting.
- Research participant name/role, or meeting title and attendees.
- Intended audience and any sensitivity beyond public-safe default.

## Non-Negotiable Rule

Raw transcripts remain private temporary inputs. They may be ingested into the explicitly approved agent/session for sanitization, subject to the user's retention and audience instructions. Do not commit them, paste them into issue trackers, forward them to additional chat channels, or preserve them in durable shared chat artifacts. If local raw storage is necessary, use an ignored private directory such as `.private/raw-transcripts/` and remove it according to the agreed retention policy.

## Sanitization

Remove or generalize:

- Small talk and off-topic personal remarks.
- Names by default; use roles or stable pseudonyms unless identity is essential and approved.
- Emails, phone numbers, addresses, account IDs, private URLs, credentials, tokens, secrets, signed links, and internal identifiers.
- Medical, legal, financial, family, HR, or relationship details.
- Customer/vendor-confidential detail unnecessary to the insight.
- Long verbatim quotes; prefer paraphrased evidence.

Keep only relevant pain points, goals, objections, workflow breakdowns, decisions, risks, open questions, and follow-ups.

## Evidence And Actions

- Preserve meaning, not raw wording.
- Use a short direct quote only when safe, anonymized, and materially better than paraphrase.
- Link issues to sanitized source documents; never paste raw transcript excerpts into issues.
- Audit every distinct relevant insight as: existing issue, new issue, updated issue, synthesis only, or intentionally excluded.
- For medium or larger research work, use an independent second pass when available.

## Final Review

- No raw PII, credentials, sensitive personal content, or unnecessary confidential detail.
- Every retained detail supports a decision, insight, or action.
- Action items live in the issue tracker, not duplicated across notes.
- Every relevant insight has a documented disposition.

Add: `Sanitized from raw transcript. Raw source not committed.`
