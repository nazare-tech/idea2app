export const PROJECT_NAME_MAX_LENGTH = 80

export type ProjectNameValidationResult =
  | { ok: true; name: string }
  | { ok: false; error: string }

const C0_C1_CONTROLS = /[\u0000-\u001f\u007f-\u009f]/g
const INVISIBLE_SEPARATORS = /[\u061c\u200b\u200e\u200f\u2060\ufeff]/g
const BIDI_FORMATTING_CONTROLS = /[\u202a-\u202e\u2066-\u2069]/g

/**
 * Normalizes a user-authored project name without changing meaningful casing,
 * punctuation, ZWNJ, or ZWJ characters used by languages and emoji sequences.
 * Length uses UTF-16 code units to match HTML input and existing name generation.
 */
export function validateProjectName(value: unknown): ProjectNameValidationResult {
  if (typeof value !== "string") {
    return { ok: false, error: "Project name is required." }
  }

  const name = value
    .normalize("NFKC")
    .replace(C0_C1_CONTROLS, " ")
    .replace(INVISIBLE_SEPARATORS, "")
    .replace(BIDI_FORMATTING_CONTROLS, "")
    .replace(/\s+/g, " ")
    .trim()

  if (!name) {
    return { ok: false, error: "Project name is required." }
  }

  if (name.length > PROJECT_NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Project names can be up to ${PROJECT_NAME_MAX_LENGTH} characters.`,
    }
  }

  return { ok: true, name }
}
