// Shared validation for free-text idea input, used by the landing idea
// capture, the intake wizard, and the intake API routes so the client
// button gating and the server floors can never drift apart.

/** An idea needs enough text to plan from; "app for dogs" is not enough. */
export const MIN_IDEA_LENGTH = 30
/** Blocks two-to-three-word inputs even when they are padded past the character floor. */
export const MIN_IDEA_WORDS = 4
export const MAX_IDEA_LENGTH = 10000

export type IdeaValidationResult =
  | { status: "ok"; idea: string }
  | { status: "empty" | "too-short" | "too-few-words"; message: string }

export const IDEA_TOO_SHORT_MESSAGE = `Add a little more detail (at least ${MIN_IDEA_LENGTH} characters) so we can build a real plan.`
export const IDEA_TOO_FEW_WORDS_MESSAGE =
  "Describe your idea in a full sentence or two: what you want to build and who it's for."
export const IDEA_EMPTY_MESSAGE = "Describe your idea to get started."

/**
 * Normalizes raw idea text (trim, collapse whitespace, cap length) and
 * checks the basic no-LLM floors. Returns the normalized idea on success
 * or a user-facing message on failure.
 */
export function validateIdeaInput(raw: string): IdeaValidationResult {
  const idea = raw.trim().replace(/\s+/g, " ").slice(0, MAX_IDEA_LENGTH)

  if (idea.length === 0) {
    return { status: "empty", message: IDEA_EMPTY_MESSAGE }
  }
  if (idea.length < MIN_IDEA_LENGTH) {
    return { status: "too-short", message: IDEA_TOO_SHORT_MESSAGE }
  }
  if (idea.split(" ").length < MIN_IDEA_WORDS) {
    return { status: "too-few-words", message: IDEA_TOO_FEW_WORDS_MESSAGE }
  }

  return { status: "ok", idea }
}
