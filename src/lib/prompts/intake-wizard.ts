import { buildSecurePrompt } from "./sanitize"
import type { ProjectNameGenerationInput } from "../intake-types"

export const INTAKE_QUESTION_SYSTEM_PROMPT = `You create structured onboarding questions for a business-idea intake wizard.

Return only valid JSON. Do not include markdown, prose, comments, or trailing commas.

The JSON must match this shape:
{
  "questions": [
    {
      "id": "short-kebab-case-id",
      "question": "Concise question text?",
      "selectionMode": "single" | "multiple",
      "options": [{ "id": "short-kebab-case-id", "label": "Chip label" }],
      "allowOther": true | false,
      "helperText": "Optional short helper text"
    }
  ]
}

Rules:
- Generate 4 to 7 questions, and prefer 5 concise questions unless the idea truly needs more.
- One question must ask where people will use the first version. It must be single-select with exactly these chip labels: "Desktop website", "Mobile website", "iOS / Android app", "Mac / Windows app". Do not include combined platform choices like "Both" or "Responsive".
- Cover target audience, problem intensity, key workflow/use case, business model, launch priority, and primary platform when relevant.
- If it would materially improve the final AI build-tool recommendation, include 1 or 2 concise tool-fit questions after the idea is captured. Useful tool-fit topics include the creator's technical comfort, whether they prefer a no-code web builder or repo-based coding agent, existing GitHub/local repo setup, and whether the first version needs a serious backend, auth, payments, private data, or tests.
- Do not ask tool-fit questions when the platform/backend needs already make the build-tool choice obvious.
- Combine related topics instead of expanding the question count; never exceed 7 total questions.
- Use "single" when one chip should be selected and "multiple" when several chips can be selected.
- Never use standalone text input questions.
- Include 3-6 concise chip options for every question.
- Set allowOther true only when a custom answer is genuinely useful.
- Set allowOther false for every "multiple" question.
- Chip labels must be short enough for UI chips, ideally 1-4 words.
- Ask practical questions that make the downstream Product Plan, First Version Plan, market research, and app generation more specific.`

const INTAKE_QUESTION_USER_PROMPT_TEMPLATE = `Create Step 2 intake questions for this Step 1 idea:

{{idea}}

Return JSON only.`

export function buildIntakeQuestionUserPrompt(idea: string): string {
  return buildSecurePrompt(
    INTAKE_QUESTION_USER_PROMPT_TEMPLATE,
    { idea },
    { maxLengths: { idea: 3000 } }
  )
}

export const PROJECT_NAME_SYSTEM_PROMPT = `You generate concise product or project names from structured startup intake context.

Return only the name. Do not include quotes, markdown, punctuation at the end, explanations, or alternatives.

Rules:
- 3-6 words.
- Title Case.
- Clear and specific to the idea.
- Avoid generic words like "Platform" unless they add useful meaning.`

const PROJECT_NAME_USER_PROMPT_TEMPLATE = `Generate one project name from this intake.

Original idea:
{{originalIdea}}

Summary:
{{summary}}

Structured context:
{{intakeContext}}`

export function buildProjectNameUserPrompt(input: ProjectNameGenerationInput): string {
  return buildSecurePrompt(
    PROJECT_NAME_USER_PROMPT_TEMPLATE,
    {
      originalIdea: input.originalIdea,
      summary: input.summary ?? "",
      intakeContext: input.intakeContext ?? "",
    },
    {
      maxLengths: {
        originalIdea: 1200,
        summary: 2500,
        intakeContext: 3000,
      },
    }
  )
}
