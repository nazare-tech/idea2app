# Plan: Impeccable Audit Fixes

## Goal
Fix the issues found by the `$impeccable audit` pass: mobile landing overflow, undersized and unreachable interactive controls, forbidden side-stripe accents, hard-coded theme leakage in markdown and Mermaid rendering, banned bounce/glass leftovers, templated landing patterns, and the unhealthy local dev-server workflow. Preserve the Maker Compass product register: restrained, builder-focused, action-oriented, and token-driven.

## Assumptions
- The existing dirty worktree contains user or prior-agent changes. This work will avoid reverting unrelated changes and will only touch files required for the audit fixes.
- This is a UI quality pass, not a product architecture change. No new dependencies should be needed.
- `PROJECT_CONTEXT.md`, `PRODUCT.md`, and `DESIGN.md` remain the source of truth for architecture, brand voice, and visual rules.
- The existing `agentation` overlay appears in runtime screenshots and may contribute console/resource noise. It is work-in-progress/dev tooling and should be left alone.
- The unhealthy `localhost:3000` process should be documented and worked around during verification. We should not kill unrelated user-owned dev processes without explicit permission.

## Clarifying Questions
1. For active navigation states, do you prefer a full-border treatment, background tint, leading icon/check state, or typography-only emphasis?

## Recommended First Step
Create a small browser verification script that reproduces the current mobile overflow and touch-target failures on `next start` at an alternate port. This gives a red-state baseline before making UI changes.

## Plan
1. Baseline and guardrails
   - Add or run a focused browser check for `/` at mobile, tablet, and desktop widths.
   - Confirm current red state: no horizontal overflow, minimum interactive target sizes, no major console errors from the app itself.
   - Run `npm run lint` to keep warnings visible.

2. Subagent split
   - Worker A owns landing responsiveness and landing anti-pattern cleanup:
     - `src/app/page.tsx`
     - `src/components/landing/landing-idea-capture.tsx`
     - `src/components/landing/waitlist-form.tsx`
     - `src/components/landing/build-map.tsx` only if needed for mobile overflow
   - Worker B owns accessibility and navigation affordances:
     - `src/components/auth/auth-password-field.tsx`
     - `src/components/layout/anchor-nav.tsx`
     - `src/components/layout/stacked-tab-nav.tsx`
     - related shared classes only if required
   - Main agent owns shared theming/motion and integration:
     - `src/app/globals.css`
     - `src/components/ui/markdown-renderer.tsx`
     - lint/build/browser verification
   - Workers are not alone in the codebase and must avoid reverting unrelated edits.

3. Fix landing responsive behavior and templated patterns
   - Make the mobile header fit at 390px without horizontal scroll.
   - Ensure visible CTA controls meet 44px target guidance where practical.
   - Replace the hero metric row and repeated icon-card grid with fewer, stronger sections that still preserve quick scanning.
   - Keep landing sharp-corner composition per `DESIGN.md`.
   - Remove placeholder footer legal links because there are no legal pages.

4. Fix auth and navigation accessibility
   - Make the password visibility button keyboard reachable, focus visible, and at least 44px by 44px.
   - Increase document sub-navigation target height and focus states.
   - Replace side-stripe active states with full-border, background, icon, or type-weight treatment.
   - Add `aria-current` or equivalent state where useful.

5. Fix theming and motion leakage
   - Replace hard-coded markdown and Mermaid colors with design tokens.
   - Remove or rename the global bounce animation so product motion uses restrained transform/opacity feedback without bounce semantics.
   - Remove unused decorative glass/grid helpers if unused, or constrain them to approved legibility use.
   - Keep `prefers-reduced-motion` behavior intact.

6. Verification and review
   - Run `npm run lint`.
   - Run `npm run build`.
   - Run browser checks on `next start` at a free port for mobile, tablet, and desktop.
   - Capture screenshots for mobile and desktop landing.
   - Re-run the audit-style grep checks for side-stripe, bounce, hard-coded pure neutrals, and overflow.
   - Write `plans/impeccable-audit-fixes-review.md` with implementation review, security review, findings, and remediation.
   - Apply final remediation and re-run focused verification.

## Milestones
- Baseline red state captured: mobile overflow and target-size failures are measurable.
- UI fixes implemented: landing, auth, navigation, markdown/Mermaid, and motion issues addressed.
- Verification green: lint/build pass and browser checks show no landing horizontal overflow at tested widths.
- Review complete: code and security review notes written, remediation done or explicitly deferred.

## Validation
- `npm run lint`
- `npm run build`
- Browser automation against `http://localhost:<free-port>/` at 390x844, 768x1024, and 1440x1000.
- Static searches for banned or risky patterns:
  - `border-l-[2-9]`, `border-left: 3px`, `animate-bounce`, `@keyframes bounce`
  - pure black/white and gray hard-codes in touched UI surfaces
  - obvious landing card-grid/hero-metric leftovers
- Manual screenshot inspection of the landing first viewport at mobile and desktop.

## Risks And Mitigations
- Risk: Subagents conflict on shared CSS. Mitigation: keep shared CSS ownership with the main agent and assign workers disjoint component files.
- Risk: Removing visual patterns weakens landing clarity. Mitigation: preserve content hierarchy and validate first viewport screenshot.
- Risk: Theme token changes affect generated document readability. Mitigation: verify markdown and Mermaid render containers still have sufficient contrast.
- Risk: The existing `localhost:3000` process remains wedged. Mitigation: verify on a separate production port and report the stale process separately.
- Risk: Dirty worktree contains overlapping user changes. Mitigation: inspect touched files before edits and do not revert unrelated modifications.

## Open Decisions
- Preferred active-nav visual language after removing side stripes.

## Critique

### Software Architect
- The plan keeps architecture stable and avoids new dependencies. The main risk is broad CSS churn; assigning shared CSS to one owner reduces merge conflicts.

### Product Manager
- The fixes align with the product promise of clarity and momentum. The landing anti-pattern cleanup should be careful not to hide important feature breadth.

### Customer Or End User
- The most user-visible wins are mobile fit, reachable controls, and more comfortable navigation in long documents. These directly affect first impression and workspace usability.

### Engineering Implementer
- The work is tractable but touches several surfaces. A browser regression script is the best practical TDD substitute for visual/responsive fixes.

### Risk, Security, Or Operations
- No auth logic, billing logic, secrets, or data access should change. Security review should focus on preserving auth form semantics and not weakening input validation or redirects.
