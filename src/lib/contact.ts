/**
 * Contact form business logic.
 *
 * Submissions from the public /contact page are validated here, then stored
 * in the `contact_requests` table by /api/contact. There is no support inbox;
 * requests are read from the Supabase dashboard.
 */

/** Matches the DB check constraints in 20260710000000_create_contact_requests.sql. */
export const CONTACT_NAME_MAX = 200
export const CONTACT_MESSAGE_MIN = 10
export const CONTACT_MESSAGE_MAX = 4000

export interface ContactRequestInput {
  name?: unknown
  email?: unknown
  message?: unknown
}

/**
 * Validates a contact form submission.
 * Returns a human-readable error string, or null if valid.
 */
export function validateContactRequest({ name, email, message }: ContactRequestInput): string | null {
  if (name != null && typeof name !== "string") {
    return "Name must be text."
  }
  if (typeof name === "string" && name.trim().length > CONTACT_NAME_MAX) {
    return "Name is too long."
  }

  if (!email || typeof email !== "string" || email.trim() === "") {
    return "Email is required."
  }
  const trimmedEmail = email.trim()
  // Mirrors contact_requests_email_format so nothing passes validation but
  // fails the DB constraint (which would surface as a retry-proof 500).
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
    return "Please enter a valid email address."
  }
  if (trimmedEmail.length > 254) {
    return "Email address is too long."
  }

  if (!message || typeof message !== "string" || message.trim() === "") {
    return "Message is required."
  }
  const trimmedMessage = message.trim()
  if (trimmedMessage.length < CONTACT_MESSAGE_MIN) {
    return "Please add a bit more detail so we can help (at least 10 characters)."
  }
  if (trimmedMessage.length > CONTACT_MESSAGE_MAX) {
    return "Message is too long (4000 characters max)."
  }

  return null
}
