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
      "selectionMode": "single" | "multiple" | "text",
      "options": [{ "id": "short-kebab-case-id", "label": "Chip label" }],
      "allowOther": true | false,
      "helperText": "Optional short helper text"
    }
  ]
}

Rules:
- Generate exactly 4 or 5 questions.
- Cover target audience, problem intensity, key workflow/use case, business model, and launch priority when relevant.
- Use "single" when one chip should be selected, "multiple" when several chips can be selected, and "text" for open-ended answers.
- For "single" and "multiple", include 3-6 concise chip options.
- For "text", use an empty options array and allowOther false.
- Chip labels must be short enough for UI chips, ideally 1-4 words.
- Ask practical questions that make the downstream PRD, MVP plan, competitive research, and app generation more specific.`

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
