---
implemented: true
implemented_at: 2026-06-22T04:24:38Z
implementation_summary: Added static glossary-backed explain controls to structured Market Research, Product Plan, First Version Plan, and AI Prompts renderers; documented real-environment UI verification rules; removed the obsolete static animation prototype.
---

# Plan: NAZ-87 Explainable Strategy Terms

## Goal
Add a hybrid explanation system for high-confusion generated strategy terms across Market Research, Product Plan, First Version Plan, and AI Prompts. The UI should visibly indicate explainable terms without cluttering dense artifacts, work with keyboard and touch, and avoid pushing users to another AI tool for basic explanations.

## Assumptions
- The first version should not add a database table, generation queue, or backend route.
- Explanations can be static, product-authored copy in the codebase.
- The visual language should stay restrained: warm dotted underlines, small help icons, and quiet section-level explain controls rather than red badges.
- The feature should use the existing Radix Tooltip dependency already present in `package.json`.
- Decision: inline explanations appear only on the first controlled occurrence in each relevant structured section.
- Decision: section-level explanations use icon-only controls with accessible labels.
- Decision: legacy markdown fallback annotation is out of scope for this issue.

## Clarifying Questions
1. Should explanations appear only on first occurrence of an inline term within each rendered section?
   - Recommendation A: First occurrence only. This keeps long artifacts readable and matches the density goal.
   - Trade-off: Repeated terms later in the section will not be visibly explainable.
   - Recommendation B: Every occurrence. This maximizes discoverability.
   - Trade-off: Dense generated text may become visually noisy.
2. Should section-level explanations be icon-only or icon plus a short visible hint?
   - Recommendation A: Icon-only beside section titles. This preserves artifact density and aligns with the hybrid option selected.
   - Trade-off: Some users may need one hover/tap to learn what the icon means.
   - Recommendation B: Icon plus tiny `Explain` label. This is more discoverable.
   - Trade-off: It adds repeated UI copy to many sections.
3. Should the first pass include legacy markdown fallback rendering?
   - Recommendation A: No, limit to structured artifact renderers. This avoids risky markdown AST rewriting and covers the current primary user flow.
   - Trade-off: Old malformed documents may not get inline glossary treatment.
   - Recommendation B: Yes, add glossary annotation to markdown-rendered fallbacks.
   - Trade-off: Higher implementation risk because arbitrary markdown and links must not be broken.

## Recommended First Step
Create a small glossary module and a reusable `ExplainTerm` / `ExplainableSectionTitle` UI component, then add targeted tests proving the affordance renders and remains accessible.

## Plan
1. Inspect local Radix/shadcn patterns and establish the minimal tooltip wrapper.
   - Output: `src/components/ui/tooltip.tsx` if no local wrapper exists.
   - Validation: Typecheck imports and confirm no new dependency is needed.
2. Add a glossary source for NAZ-87 terms.
   - Output: `src/lib/explainable-terms.ts`.
   - Include P0/P1 terms from the audit: proprietary data assets, internal/external risks, project size, team composition, validation plan, riskiest assumption, positioning map, differentiator/wedge/key edge, defensibility/moat/hard to copy, gap analysis, dependencies, assumptions, acceptance criteria, functional requirements, non-functional requirements, manual shortcuts, concierge MVP, Wizard-of-Oz MVP.
   - Validation: Unit test lookup behavior and duplicate-safe matching if helper logic is added.
3. Add reusable UI treatments.
   - Output: likely `src/components/analysis/explainable-term.tsx`.
   - Inline term treatment: dotted underline, subtle warm-paper hover/focus background, tiny `CircleHelp` icon, Radix tooltip content.
   - Section treatment: small bordered `CircleHelp` icon button beside section headings with tooltip text.
   - Accessibility: focusable trigger, `aria-label`, not hover-only, touch/click support through Radix.
4. Integrate section-level helpers into structured artifact renderers.
   - Market Research: Positioning Map, Gap Analysis, Ways to Stand Out, What Makes It Hard to Copy, Risks & Competitor Responses, First Version Focus.
   - Product Plan: Technical Considerations, Success Metrics, Timeline & Milestones, Risks/Dependencies/Assumptions.
   - First Version Plan: Key Assumptions, MVP Scope, Suggested Stack, Validation Plan.
   - AI Prompts: AI Build Guardrails, AI-Friendly Build Sequence, Functional Requirements, User Stories & Acceptance Criteria.
5. Add inline term treatment where the renderer controls labels directly.
   - Product Plan masthead: Project Size and Team Members.
   - Timeline team/estimate labels: Project estimate and Team Composition.
   - Risk/assumption labels: Impact, Mitigation, Highest Risk.
   - First Version tables and AI Prompts headings where labels are stable.
6. Verification and review.
   - Run focused component tests for planning and competitive analysis renderers.
   - Run `npm run typecheck`.
   - Run `npm run lint`.
   - For UI verification, use the in-app browser if a local dev server is needed and credentials are available.
   - Write `docs/plans/naz-87-explainable-terms-review.md` with code review, security review, and remediation notes.

## Milestones
- Glossary and tooltip component: reusable, accessible primitives exist.
- Market/Product/FVP integration: high-confusion terms have visible affordances in structured renderers.
- Verification: focused tests and typecheck pass, and UI affordances are visually checked.
- Review complete: code and security review findings are documented and remediated or explicitly deferred.

## Validation
- `node --import tsx --test src/components/analysis/planning-document-blocks.test.tsx src/components/analysis/competitive-analysis-document.test.tsx`
- `npm run typecheck`
- `npm run lint`
- Browser check: open a workspace artifact or fixture route, confirm dotted/outlined help affordances are visible and tooltips work with pointer and keyboard focus.

## Risks And Mitigations
- Visual noise in dense artifacts: mark only first/stable occurrences and use section-level helpers for broad concepts.
- Tooltip inaccessible on touch or keyboard: use Radix Tooltip triggers with focusable controls and labels.
- Breaking generated markdown rendering: avoid arbitrary markdown rewriting in the first pass.
- Overuse of red accent: keep red out of the tooltip treatment except focus rings if existing system requires it.
- Long explanations create popover clutter: cap explanation copy to 1-2 sentences.

## Rollback Or Recovery
- The change can be reverted by removing the glossary component integrations while leaving generated artifact content unchanged.
- Since no data model or generation contract changes are planned, rollback does not require migration or cleanup.

## Open Decisions
- None for the first implementation pass.

## Critique

### Software Architect
- A shared glossary component is the right seam, but avoid a global markdown rewriting layer in the first iteration. It would be fragile around links, code, tables, and existing renderer assumptions.

### Product Manager
- The feature directly addresses NAZ-87 if it covers the terms surfaced by research and keeps the advanced artifact density intact. Scope should favor the terms most likely to block a first-time founder.

### Customer Or End User
- The visual cue must be unmistakable enough to notice, but quiet enough that reading the Product Plan still feels like reading a working document, not a help center.

### Engineering Implementer
- Most work should be additive. The main risk is touching large renderer files; changes should be small helper insertions with tests around stable rendered labels.

### Risk, Security, Or Operations
- Static tooltip content has low security risk. Do not pass generated artifact text into unsafe HTML or dynamic tooltip markup. Keep all content as React text.
