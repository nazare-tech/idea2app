import { formatProjectIntakeForAi } from "@/lib/intake-context"
import type { IntakeAnswer, IntakeQuestion, ProjectIntakePayload } from "@/lib/intake-types"

type IntakeContextQuery = {
  select(columns: string): {
    eq(column: string, value: unknown): {
      order(column: string, options?: { ascending?: boolean }): {
        limit(count: number): {
          maybeSingle(): Promise<{ data: unknown; error: { message?: string } | null }>
        }
      }
    }
  }
}

type IntakeContextClient = {
  from(table: string): {
    select: IntakeContextQuery["select"]
  }
}

export async function getProjectIntakeContextForAi(
  supabase: unknown,
  projectId: string,
  fallbackDescription: string
): Promise<string> {
  try {
    const client = supabase as IntakeContextClient
    const { data, error } = await client
      .from("project_intakes")
      .select("raw_payload_json, generated_summary")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !isRecord(data)) {
      return fallbackDescription
    }

    const payload = parseProjectIntakePayload(data.raw_payload_json)
    if (!payload) {
      return typeof data.generated_summary === "string"
        ? data.generated_summary
        : fallbackDescription
    }

    const summary = typeof data.generated_summary === "string" ? data.generated_summary : fallbackDescription
    return `${summary}\n\n${formatProjectIntakeForAi(payload)}`.trim()
  } catch {
    return fallbackDescription
  }
}

export function parseProjectIntakePayload(value: unknown): ProjectIntakePayload | null {
  if (!isRecord(value)) return null
  if (typeof value.schemaVersion !== "string") return null
  if (typeof value.originalIdea !== "string") return null
  if (!Array.isArray(value.questions) || !Array.isArray(value.answers)) return null
  if (typeof value.source !== "string" || typeof value.createdAt !== "string") return null

  return {
    schemaVersion: "idea-intake-v1",
    originalIdea: value.originalIdea,
    questions: value.questions.filter(isIntakeQuestion),
    answers: value.answers.filter(isIntakeAnswer),
    source: value.source === "landing" || value.source === "dashboard" || value.source === "prompt-chat" || value.source === "manual"
      ? value.source
      : "wizard",
    createdAt: value.createdAt,
  }
}

function isIntakeQuestion(value: unknown): value is IntakeQuestion {
  if (!isRecord(value)) return false
  return (
    typeof value.id === "string" &&
    typeof value.question === "string" &&
    (value.selectionMode === "single" || value.selectionMode === "multiple" || value.selectionMode === "text") &&
    Array.isArray(value.options) &&
    typeof value.allowOther === "boolean"
  )
}

function isIntakeAnswer(value: unknown): value is IntakeAnswer {
  return isRecord(value) && typeof value.questionId === "string"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}
