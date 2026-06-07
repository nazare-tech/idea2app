export const OPENROUTER_LONG_TEXT_TIMEOUT_MS = 790_000

export function createOpenRouterLongTextSignal() {
  return AbortSignal.timeout(OPENROUTER_LONG_TEXT_TIMEOUT_MS)
}

export function formatOpenRouterTimeoutDuration(timeoutMs = OPENROUTER_LONG_TEXT_TIMEOUT_MS) {
  const seconds = Math.round(timeoutMs / 1000)
  if (seconds % 60 === 0) return `${seconds / 60} minutes`
  return `${seconds} seconds`
}

export function isOpenRouterAbortError(error: unknown) {
  if (!(error instanceof Error)) return false

  const name = error.name.toLowerCase()
  const message = error.message.toLowerCase()

  return (
    name.includes("abort") ||
    name.includes("timeout") ||
    message.includes("aborted") ||
    message.includes("abort") ||
    message.includes("timeout")
  )
}

export function buildOpenRouterTimeoutMessage(label: string) {
  return `${label} generation timed out after ${formatOpenRouterTimeoutDuration()}. Try a smaller prompt, a faster model, or run it again.`
}
