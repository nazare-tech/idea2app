/**
 * Retry utility for external API calls.
 * Retries on 429 (rate limit) and 5xx errors with exponential backoff.
 */

interface RetryOptions {
  /** Number of retry attempts (default: 3) */
  retries?: number
  /** Backoff delays in ms for each retry (default: [1000, 2000, 4000]) */
  backoff?: number[]
  /** Label for log messages */
  label?: string
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message
    // Match HTTP status codes that warrant a retry
    if (/\b429\b/.test(msg)) return true
    if (/\b5\d{2}\b/.test(msg)) return true
    // Network-level failures
    if (/fetch failed|ECONNRESET|ETIMEDOUT|socket hang up/i.test(msg)) return true
  }
  // OpenAI SDK errors expose a `status` property
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status: number }).status
    if (status === 429 || (status >= 500 && status < 600)) return true
  }
  return false
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { retries = 3, backoff = [1000, 2000, 4000], label = "API call" } = options

  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < retries && isRetryableError(error)) {
        const delay = backoff[attempt] ?? backoff[backoff.length - 1]
        console.warn(
          `[withRetry] ${label} failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms:`,
          error instanceof Error ? error.message : error
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
      } else {
        break
      }
    }
  }
  throw lastError
}
