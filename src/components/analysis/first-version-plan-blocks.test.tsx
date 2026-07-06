import test from "node:test"
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"
import { buildAiPromptFiles } from "./ai-prompt-files"
import {
  AiPromptsDocumentBlocks,
  MvpPlanDocumentBlocks,
} from "./first-version-plan-blocks"
import { extractSectionsByHeading } from "@/lib/planning-document-parser"

test("MvpPlanDocumentBlocks renders current numbered MVP prompt content as blocks", () => {
  const html = renderToStaticMarkup(
    <MvpPlanDocumentBlocks
      projectId="project-1"
      content={`# MVP Plan: Proposal Pilot

## 1. MVP Summary
Proposal Pilot helps freelance designers turn client notes into proposals.

## 2. Key Assumptions and Scope Decisions
- [HIGH CONFIDENCE] Freelance designers need faster proposal turnaround.
- [SCOPE DECISION] CRM features are excluded from the MVP.

## 3. Target User and Problem
### Primary User
Freelance designers who manage proposals manually.
### Problem
They rewrite scope and pricing language for every lead.
### Riskiest Product Assumption
Designers will trust the generated draft enough to edit it.

## 4. Core User Flow
1. User opens the proposal workspace.
2. User enters client notes.
3. System generates a proposal draft.

## 5. MVP Scope
| Category | Include in MVP | Exclude for Now |
|---|---|---|
| Core input | Structured proposal intake | CRM import |

## 6. Must-Have Features
| Feature | Why It Matters | Acceptance Criteria |
|---|---|---|
| Proposal intake | Captures useful context | User can submit required fields |

## 7. Suggested Build Approach
| Layer | Recommendation | Why |
|---|---|---|
| Frontend | Next.js + Tailwind | Fast workspace UI |

## 8. AI-Friendly Build Sequence
| Step | Build Chunk | Goal | Test Before Moving On |
|---|---|---|---|
| 1 | Proposal intake form | Capture context | Submit valid and invalid input |

## 9. Validation Plan
### First Test Audience
Five freelance designers who send proposals monthly.

### Suggested Metrics
- 60% of users complete a generation.

## 10. Cut List
- If CRM import takes too long, then use CSV upload only.

## 11. AI Build Guardrails
- Build one chunk at a time.
- Do not add features outside MVP scope.

## 12. Next Prompt for AI Coding Tool
Start with the proposal intake form and mock proposal generation.
`}
    />,
  )

  assert.doesNotMatch(html, /Block view unavailable/)
  assert.match(html, /First Version Plan/)
  assert.match(html, /MVP Summary/)
  assert.match(html, /id="mvp-summary"/)
  assert.doesNotMatch(html, /id="mvp-bet"/)
  assert.match(html, /id="mvp-target-user-problem"/)
  assert.match(html, /id="mvp-core-user-flow"/)
  assert.match(html, /id="mvp-key-assumptions"/)
  assert.match(html, /id="mvp-scope"/)
  assert.match(html, /id="mvp-suggested-stack"/)
  assert.match(html, /id="mvp-validation-plan"/)
  assert.match(html, /id="mvp-cut-list"/)
  assert.match(html, /Target User &amp; Problem/)
  assert.match(html, /Core User Flow/)
  assert.match(html, /Key Risks &amp; Assumptions/)
  assert.match(html, /MVP Scope/)
  assert.match(html, /Suggested Build Approach/)
  assert.match(html, /Validation Plan/)
  assert.match(html, /Cut List/)
  assert.match(html, /01 \/ 08/)
  assert.match(html, /08 \/ 08/)
  assert.match(html, /fvp-flow/)
  assert.match(html, /fvp-cuts/)
  assert.match(html, /pp-tech-grid/)
  assert.match(html, /pp-nongoals/)
  assert.match(html, /Proposal intake/)
  assert.match(html, /Next\.js \+ Tailwind/)
  assert.match(html, /60%/)
  assert.match(html, /HIGH CONFIDENCE/)
  assert.match(html, /Freelance designers need faster proposal turnaround/)
  assert.doesNotMatch(html, /\[HIGH CONFIDENCE\]/)
  assert.doesNotMatch(html, /Key Assumptions &amp; Scope/)
  assert.doesNotMatch(html, /Build Steps/)
  assert.doesNotMatch(html, /min-w-\[140px\]/)
  assert.doesNotMatch(html, /Plan Snapshot/)
  assert.doesNotMatch(html, /bg-\[#FAFAFA\] px-5 py-5/)
  assert.doesNotMatch(html, /bg-\[#4A4040\]/)
  assert.doesNotMatch(html, /grid gap-4 xl:grid-cols-2/)
  assert.doesNotMatch(html, /What We Need to Prove/)
  assert.doesNotMatch(html, /Core Features/)
  assert.doesNotMatch(html, /id="mvp-ai-friendly-build-sequence"/)
  assert.doesNotMatch(html, /id="mvp-ai-build-guardrails"/)
  assert.doesNotMatch(html, /id="mvp-next-prompt"/)
  assert.doesNotMatch(html, /AI-Friendly Build Sequence/)
  assert.doesNotMatch(html, /AI Build Guardrails/)
  assert.doesNotMatch(html, /Next Prompt/)
})

test("AiPromptsDocumentBlocks renders recommended tool section and prompt file cards", () => {
  const html = renderToStaticMarkup(
    <AiPromptsDocumentBlocks
      projectId="project-1"
      prdContent={`# PRD

## Team and milestones

### Agents
- Frontend agent: Builds the proposal intake and review screens.
- Backend agent: Owns the Supabase schema and API routes.

## Functional requirements
- Users can create a proposal from structured intake fields.

## User stories and acceptance criteria
- As a designer, I can generate a proposal draft.
`}
      mvpContent={`# MVP Plan

## MVP Summary
A proposal drafting tool for freelance designers.

## Recommended AI Build Tool
### Cursor
- **Why this tool:** Full-stack **Next.js/Supabase** project in an existing GitHub repo.
- **Best fit for this project:** Build the proposal intake and generated proposal review screens first.
- **Expected starting cost**: Free tier first; $20/month Pro once iteration starts.
- **Watch out:** Verify Supabase RLS policy syntax manually.
- **Handoff instruction:** Clone your repo, open it in Cursor, and paste the Next Prompt.

## Next Prompt for AI Coding Tool
Start with the proposal intake form.

## AI Build Guardrails
- Build one chunk at a time.

## AI-Friendly Build Sequence
| Step | Build Chunk | Goal | Test Before Moving On |
|---|---|---|---|
| 1 | Proposal intake form | Capture context | Submit valid and invalid input |
`}
    />,
  )

  assert.match(html, /AI Prompts/)
  assert.match(html, /Recommended AI Build Tool/)
  assert.match(html, /href="https:\/\/cursor\.com"/)
  assert.match(html, /id="ai-prompts-recommended-build-tool"/)
  assert.match(html, /Prompt Files/)
  assert.match(html, /id="ai-prompts-files"/)
  assert.match(html, /id="ai-prompts-first-prompt"/)
  assert.match(html, /id="ai-prompts-build-guardrails"/)
  assert.match(html, /id="ai-prompts-build-steps"/)
  assert.match(html, /id="ai-prompts-functional-requirements"/)
  assert.match(html, /id="ai-prompts-user-stories-acceptance-criteria"/)
  assert.match(html, /id="ai-prompts-sub-agents"/)
  assert.match(html, /id="ai-prompts-project-context"/)
  assert.match(html, /first-prompt\.md/)
  assert.match(html, /ai-build-guardrails\.md/)
  assert.match(html, /build-steps\.md/)
  assert.match(html, /functional-requirements\.md/)
  assert.match(html, /user-stories-and-acceptance-criteria\.md/)
  assert.match(html, /sub-agents\.md/)
  assert.match(html, /project-context\.md/)
  assert.match(html, /aria-label="Copy first-prompt\.md"/)
  assert.match(html, /aria-label="Download first-prompt\.md"/)
  assert.match(html, /aria-label="Open first-prompt\.md preview"/)
  assert.match(html, /How to use these files/)
  // Tool fields parse with the colon either inside or outside the bold marker,
  // so the raw section (including "### Cursor") must not leak into the card.
  assert.match(html, /Build the proposal intake and generated proposal review screens first\./)
  assert.match(html, /Free tier first; \$20\/month Pro once iteration starts\./)
  assert.match(html, /Verify Supabase RLS policy syntax manually\./)
  assert.doesNotMatch(html, /### Cursor/)
  // Recommended tool detail values render inline markdown instead of raw asterisks
  assert.match(html, /<strong[^>]*>Next\.js\/Supabase<\/strong>/)
  assert.doesNotMatch(html, /\*\*Next\.js\/Supabase\*\*/)
  assert.ok(html.indexOf("Recommended AI Build Tool") < html.indexOf("Prompt Files"))
  // Card order is asserted via anchor ids because the usage guide above the
  // grid also mentions the file names.
  assert.ok(html.indexOf('id="ai-prompts-first-prompt"') < html.indexOf('id="ai-prompts-build-guardrails"'))
  assert.ok(html.indexOf('id="ai-prompts-build-guardrails"') < html.indexOf('id="ai-prompts-build-steps"'))
})

test("buildAiPromptFiles emits paste-ready file content without injected headings", () => {
  const mvpSections = extractSectionsByHeading(
    [
      "# MVP Plan",
      "",
      "## Next Prompt for AI Coding Tool",
      "```text",
      "You are helping me build X.",
      "Build only the first chunk.",
      "```",
      "",
      "## AI-Friendly Build Sequence",
      "| Step | Build Chunk | Goal | Test Before Moving On |",
      "|---|---|---|---|",
      "| 1 | Intake form | Capture context | Submit valid input |",
    ].join("\n"),
    2,
  )
  const files = buildAiPromptFiles({ prdSections: [], mvpSections })

  const nextPrompt = files.find((file) => file.fileName === "first-prompt.md")
  assert.ok(nextPrompt)
  // Fence markers are stripped so the copied file is directly paste-ready.
  assert.doesNotMatch(nextPrompt.content, /```/)
  assert.match(nextPrompt.content, /^You are helping me build X\./)
  // No injected H1 title; the file name identifies the file.
  assert.doesNotMatch(nextPrompt.content, /^# /m)

  const buildSequence = files.find((file) => file.fileName === "build-steps.md")
  assert.ok(buildSequence)
  assert.doesNotMatch(buildSequence.content, /^# /m)
  assert.match(buildSequence.content, /\| Intake form \|/)
})
