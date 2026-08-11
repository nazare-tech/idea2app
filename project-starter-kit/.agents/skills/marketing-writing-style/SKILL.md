---
name: marketing-writing-style
description: This skill should be used whenever drafting, rewriting, editing, or critiquing marketing copy, including posts, scripts, landing-page copy, campaigns, emails, ads, and founder-led content. It enforces a direct spoken voice without formulaic contrast, repetition, summary, or performed enthusiasm.
---

# Marketing Writing Style

Apply this style to generated marketing prose. Preserve source material, facts, quotations, code, legal language, and user-supplied raw ideas exactly when the task requires fidelity.

## Trigger

Use this skill for:

- Drafting or rewriting marketing copy
- Developing an idea captured by `marketing-idea-capture`
- Writing founder-led posts, video scripts, ads, emails, landing pages, or campaign assets
- Editing existing marketing prose for voice
- Critiquing copy against the project's writing standard

Do not apply it to the verbatim `## Raw idea` section of an idea capture. Apply it to agent-written analysis, hooks, drafts, and campaign material.

Read `brand/brand.md` when present and populated. Treat its audience, positioning, vocabulary, and voice decisions as content constraints. Treat this skill as the prose-form constraint.

## Source Policy

Preserve and enforce this policy:

> No antithesis. No corrective negation. No paragraph pinning. No parataxis. No summary beats. No rhetorical crutches. No negative parallelisms. No negative anaphoras. No contrasting pairs. No rule of three. No em dashes. No throat-clearing openers. No landing sentences. No setup/payoff constructions. No parallel sentence structures within a paragraph. Vary sentence length unpredictably. No stacked noun phrases. No filler intensifiers (genuinely, really, truly, actually). No corporate-register verbs (leverage, underscore, reflect). No nominalization. No hedging qualifiers. Write for the spoken voice. No performed enthusiasm.

## Operational Interpretation

- State the useful point immediately. Remove scene-setting that delays it.
- Express one clear movement of thought at a time. Use natural connective syntax instead of placing clipped independent clauses side by side.
- Avoid “not X, but Y,” “this is not about X,” “less X, more Y,” and equivalent contrast frames.
- Avoid repeated negative openings such as “No X. No Y.” in the produced copy.
- Avoid mirrored clauses, paired opposites, repeated sentence molds, and three-item rhetorical lists.
- Let paragraph boundaries follow changes in thought. Do not force a topic sentence at the start or a conclusive slogan at the end.
- Deliver information when it becomes relevant. Do not tease a payoff, recap a section, or restate the main point as a closing beat.
- Prefer concrete subjects and active verbs. Expand dense noun clusters into natural spoken phrases.
- Replace nominalizations with verbs: use “decide” instead of “make a decision,” and “analyze” instead of “perform an analysis.”
- Remove filler intensifiers, corporate-register verbs, and hedging that weakens a supported statement.
- Vary sentence length and syntax without creating a visible cadence pattern.
- Use punctuation suited to speech. Replace em dashes with periods, commas, parentheses, or rewritten syntax.
- Keep energy inside the observation, evidence, or phrasing. Do not add exclamation marks, hype labels, or declarations of excitement to perform enthusiasm.

Accuracy outranks style. Keep a necessary factual negation when removing it would change the meaning. Rewrite its surrounding structure so it does not become a contrast device or repeated rhetorical pattern.

## Draft Workflow

1. Identify the audience, desired action, channel, and factual claims.
2. Draft for spoken delivery with concrete nouns and active verbs.
3. Run the audit below.
4. Read the draft aloud mentally. Rewrite any sentence that sounds staged, corporate, slogan-like, or structurally repetitive.
5. Return the copy without explaining every avoided pattern unless the user asks for an audit.

## Audit

Check every draft before returning it:

- Search for em dashes and remove them.
- Search for `not`, `isn't`, `aren't`, `rather than`, `instead of`, `less`, `more`, and `but`; inspect each use for corrective negation or a contrasting pair.
- Search for `genuinely`, `really`, `truly`, `actually`, `leverage`, `underscore`, and `reflect`; replace or remove each prose use.
- Inspect adjacent sentences for repeated openings, length, clause order, or grammatical shape.
- Inspect lists and sequences for a manufactured three-beat cadence.
- Inspect paragraph openings for throat-clearing and paragraph endings for summaries, slogans, or artificial landing lines.
- Read the result as spoken language. Simplify stacked noun phrases and nominalizations.

## Critique Mode

When asked to critique existing copy:

1. Quote only the shortest phrase needed to identify a problem.
2. Name the violated constraint.
3. Explain the effect on the spoken voice.
4. Offer a rewrite that preserves meaning and complies with the full policy.

Do not rewrite verbatim quotations or user-designated source language without explicit permission.

## Maintenance Smoke Test

After changing this skill, ask the active runtime to rewrite:

> Actually, this isn't just a faster planning tool — it's a genuinely revolutionary command center. Leverage smarter workflows, stronger insights, and better alignment. We couldn't be more excited!

Confirm that the result preserves the core claim while removing the em dash, corrective contrast, filler intensifiers, corporate-register verb, three-beat list, stacked noun phrase, and performed enthusiasm. Inspect the rewrite for every other source-policy constraint before accepting it.
