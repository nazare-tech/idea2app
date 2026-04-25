import test from "node:test"
import assert from "node:assert/strict"
import {
  DEFAULT_AUTH_REDIRECT_FALLBACK,
  getSafeAuthRedirect,
  isSafeInternalRedirect,
  sanitizeInternalRedirect,
} from "./safe-redirect"

test("sanitizeInternalRedirect allows project wizard intake paths", () => {
  assert.equal(
    sanitizeInternalRedirect("/projects/new?intake=opaque-token"),
    "/projects/new?intake=opaque-token"
  )
})

test("sanitizeInternalRedirect allows configured dashboard paths", () => {
  assert.equal(sanitizeInternalRedirect("/dashboard"), "/dashboard")
  assert.equal(
    sanitizeInternalRedirect("/preferences?tab=subscriptions"),
    "/preferences?tab=subscriptions"
  )
})

test("sanitizeInternalRedirect rejects absolute and protocol-relative URLs", () => {
  assert.equal(sanitizeInternalRedirect("https://evil.example/projects"), DEFAULT_AUTH_REDIRECT_FALLBACK)
  assert.equal(sanitizeInternalRedirect("//evil.example/projects"), DEFAULT_AUTH_REDIRECT_FALLBACK)
})

test("sanitizeInternalRedirect rejects non-path values", () => {
  assert.equal(sanitizeInternalRedirect("projects/new"), DEFAULT_AUTH_REDIRECT_FALLBACK)
  assert.equal(sanitizeInternalRedirect("javascript:alert(1)"), DEFAULT_AUTH_REDIRECT_FALLBACK)
  assert.equal(sanitizeInternalRedirect(null), DEFAULT_AUTH_REDIRECT_FALLBACK)
})

test("sanitizeInternalRedirect rejects non-allowlisted internal paths", () => {
  assert.equal(sanitizeInternalRedirect("/api/private"), DEFAULT_AUTH_REDIRECT_FALLBACK)
  assert.equal(sanitizeInternalRedirect("/projectsevil"), DEFAULT_AUTH_REDIRECT_FALLBACK)
})

test("sanitizeInternalRedirect rejects backslashes and control characters", () => {
  assert.equal(sanitizeInternalRedirect("/projects\\evil.example"), DEFAULT_AUTH_REDIRECT_FALLBACK)
  assert.equal(sanitizeInternalRedirect("/projects/new\nLocation: https://evil.example"), DEFAULT_AUTH_REDIRECT_FALLBACK)
})

test("sanitizeInternalRedirect normalizes dot segments before allowlist checks", () => {
  assert.equal(
    sanitizeInternalRedirect("/projects/../preferences?tab=subscriptions"),
    "/preferences?tab=subscriptions"
  )
  assert.equal(sanitizeInternalRedirect("/projects/../../api/private"), DEFAULT_AUTH_REDIRECT_FALLBACK)
})

test("sanitizeInternalRedirect supports a custom allowlist and fallback", () => {
  assert.equal(
    sanitizeInternalRedirect("/auth/callback", {
      fallback: "/auth",
      allowedPathPrefixes: ["/auth"],
    }),
    "/auth/callback"
  )
  assert.equal(
    sanitizeInternalRedirect("/projects", {
      fallback: "/auth",
      allowedPathPrefixes: ["/auth"],
    }),
    "/auth"
  )
})

test("isSafeInternalRedirect mirrors sanitizer validation", () => {
  assert.equal(isSafeInternalRedirect("/projects/new?intake=token"), true)
  assert.equal(isSafeInternalRedirect("https://evil.example"), false)
})

test("getSafeAuthRedirect reads next before redirect", () => {
  const params = new URLSearchParams({
    next: "/projects/new?intake=token",
    redirect: "/dashboard",
  })

  assert.equal(getSafeAuthRedirect(params), "/projects/new?intake=token")
})

test("getSafeAuthRedirect falls back when params are unsafe or missing", () => {
  assert.equal(
    getSafeAuthRedirect({ next: "https://evil.example", redirect: "/dashboard" }),
    DEFAULT_AUTH_REDIRECT_FALLBACK
  )
  assert.equal(getSafeAuthRedirect({}), DEFAULT_AUTH_REDIRECT_FALLBACK)
})
