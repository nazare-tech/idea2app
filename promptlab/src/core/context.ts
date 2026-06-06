import type { PromptLabContextPayload, PromptLabResolvedContextSource } from "./types.js"

export interface PromptContextBlockOptions {
  maxCharsPerSource?: number
}

export function buildPromptContextBlock(
  sources: PromptLabResolvedContextSource[],
  options: PromptContextBlockOptions = {},
) {
  if (sources.length === 0) return ""

  const maxCharsPerSource = options.maxCharsPerSource ?? 20_000
  return sources
    .map((source, index) => {
      const rendered = renderPayload(source.payload)
      const truncated = rendered.length > maxCharsPerSource
        ? rendered.slice(0, maxCharsPerSource)
        : rendered
      const truncationNote = rendered.length > maxCharsPerSource
        ? `\n\n[PromptLab note: source truncated from ${rendered.length} to ${maxCharsPerSource} characters.]`
        : ""

      return [
        `## ${source.label}`,
        `Source ID: ${source.id}`,
        `Source type: ${source.type}`,
        `Content type: ${source.contentType}`,
        "",
        truncated,
        truncationNote,
        index === sources.length - 1 ? "" : "\n---",
      ].join("\n")
    })
    .join("\n")
    .trim()
}

function renderPayload(payload: PromptLabContextPayload) {
  if (payload.kind === "text") return payload.content
  if (payload.kind === "json") return JSON.stringify(payload.value, null, 2)
  return `[Image: ${payload.alt ?? payload.url}]\n${payload.url}`
}
