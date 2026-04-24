import type { ProjectIntakePayload } from "./intake-types"
import { summarizeIntakeAnswers } from "./intake-summary"

export function formatProjectIntakeForAi(payload: ProjectIntakePayload): string {
  const lines = [
    `Structured intake (${payload.schemaVersion})`,
    `Source: ${payload.source}`,
    `Original idea: ${payload.originalIdea}`,
  ]

  const answerItems = summarizeIntakeAnswers(payload.questions, payload.answers)
    .filter((item) => item.answer.length > 0)

  if (answerItems.length > 0) {
    lines.push("", "Wizard answers:")
    for (const item of answerItems) {
      lines.push(`- ${item.question}: ${item.answer}`)
    }
  }

  return lines.join("\n").trim()
}
