/**
 * Waitlist business logic.
 *
 * The first WAITLIST_LIMIT registered users get full access.
 * Any visitor after that threshold sees a waitlist sign-up instead
 * of the standard "Get Started" / "Sign In" flow.
 */

export const WAITLIST_LIMIT = 200

/**
 * Returns true when the platform has reached or exceeded its early-access cap,
 * meaning new visitors should be routed to the waitlist.
 */
export function isWaitlistMode(userCount: number): boolean {
  return userCount >= WAITLIST_LIMIT
}

/**
 * Validates an email string for waitlist submission.
 * Returns a human-readable error string, or null if valid.
 */
export function validateWaitlistEmail(email: unknown): string | null {
  if (!email || typeof email !== "string" || email.trim() === "") {
    return "Email is required."
  }
  const trimmed = email.trim()
  if (!trimmed.includes("@") || !/\.[a-z]{2,}$/i.test(trimmed)) {
    return "Please enter a valid email address."
  }
  if (trimmed.length > 254) {
    return "Email address is too long."
  }
  return null
}
