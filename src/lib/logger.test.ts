import assert from "node:assert/strict"
import test from "node:test"

import {
  buildRequestLogContext,
  logError,
  logInfo,
  normalizeLogError,
  sanitizeLogContext,
} from "./logger"

const originalInfo = console.info
const originalError = console.error

test.afterEach(() => {
  console.info = originalInfo
  console.error = originalError
})

test("logInfo writes structured JSON with sanitized context", () => {
  const messages: string[] = []
  console.info = (message?: unknown) => {
    messages.push(String(message))
  }

  logInfo("GenerateAll", "queue_started", {
    projectId: "project_123",
    prompt: "private prompt text",
    nested: {
      apiKey: "secret-key",
      count: 2,
    },
  })

  assert.equal(messages.length, 1)
  const payload = JSON.parse(messages[0])
  assert.equal(payload.level, "info")
  assert.equal(payload.scope, "GenerateAll")
  assert.equal(payload.event, "queue_started")
  assert.equal(payload.context.projectId, "project_123")
  assert.equal(payload.context.prompt, "[redacted]")
  assert.equal(payload.context.nested.apiKey, "[redacted]")
  assert.equal(payload.context.nested.count, 2)
  assert.match(payload.ts, /^\d{4}-\d{2}-\d{2}T/)
})

test("logError normalizes errors without serializing raw objects", () => {
  const messages: string[] = []
  console.error = (message?: unknown) => {
    messages.push(String(message))
  }

  const error = Object.assign(new Error("Provider request failed because of a private body"), {
    status: 502,
    code: "bad_gateway",
  })

  logError("Mockup", "provider_failed", error, {
    imageUrl: "https://storage.example/signed-token",
  })

  assert.equal(messages.length, 1)
  const payload = JSON.parse(messages[0])
  assert.equal(payload.level, "error")
  assert.deepEqual(payload.error, {
    name: "Error",
    message: "Provider request failed because of a private body",
    status: 502,
    code: "bad_gateway",
  })
  assert.equal(payload.context.imageUrl, "[redacted]")
})

test("logError redacts sensitive values embedded in error messages", () => {
  const messages: string[] = []
  console.error = (message?: unknown) => {
    messages.push(String(message))
  }

  const error = new Error(
    [
      "OpenRouter failed",
      "Authorization: Bearer sk-or-v1-secret-token",
      "api_key=or-secret-value",
      "Cookie: sb-access-token=session-secret; session=other-secret",
      "founder@example.com",
      "https://storage.example/file.png?token=url-token&signature=url-signature",
    ].join(" "),
  )

  logError("Mockup", "provider_failed", error)

  assert.equal(messages.length, 1)
  const payload = JSON.parse(messages[0])
  assert.match(payload.error.message, /\[redacted\]/)
  assert.doesNotMatch(payload.error.message, /sk-or-v1-secret-token/)
  assert.doesNotMatch(payload.error.message, /or-secret-value/)
  assert.doesNotMatch(payload.error.message, /sb-access-token=session-secret/)
  assert.doesNotMatch(payload.error.message, /other-secret/)
  assert.doesNotMatch(payload.error.message, /founder@example\.com/)
  assert.doesNotMatch(payload.error.message, /url-token/)
  assert.doesNotMatch(payload.error.message, /url-signature/)
})

test("normalizeLogError redacts provider JSON bodies embedded in messages", () => {
  const normalized = normalizeLogError(
    new Error(
      'Provider 400 request body: {"idea":"private idea","prompt":"build private app","messages":[{"role":"user","content":"secret content"}],"email":"founder@example.com"}',
    ),
  )

  assert.match(normalized.message, /\[redacted\]/)
  assert.doesNotMatch(normalized.message, /private idea/)
  assert.doesNotMatch(normalized.message, /build private app/)
  assert.doesNotMatch(normalized.message, /secret content/)
  assert.doesNotMatch(normalized.message, /founder@example\.com/)
})

test("sanitizeLogContext truncates long strings and arrays", () => {
  const sanitized = sanitizeLogContext({
    label: "a".repeat(1_500),
    values: Array.from({ length: 20 }, (_, index) => index),
    content: "private document text",
    contentLength: 42,
    contentType: "image/png",
    detail: "Failed for user founder@example.com with token=abc123",
  })

  assert.equal(typeof sanitized.label, "string")
  assert.equal((sanitized.label as string).length, 1_000)
  assert.deepEqual(sanitized.values, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, "[truncated]"])
  assert.equal(sanitized.content, "[redacted]")
  assert.equal(sanitized.contentLength, 42)
  assert.equal(sanitized.contentType, "image/png")
  assert.equal(sanitized.detail, "Failed for user [redacted] with token=[redacted]")
})

test("normalizeLogError accepts unknown thrown values", () => {
  assert.deepEqual(normalizeLogError("plain failure"), {
    message: "plain failure",
  })
  assert.deepEqual(normalizeLogError({ status: 429, message: "rate limited" }), {
    message: "rate limited",
    status: 429,
  })
})

test("buildRequestLogContext includes caller request id or creates one", () => {
  const withHeader = buildRequestLogContext(
    new Request("https://example.test/api/demo?ignored=1", {
      method: "POST",
      headers: { "x-request-id": "req_123" },
    }),
  )
  assert.equal(withHeader.requestId, "req_123")
  assert.equal(withHeader.method, "POST")
  assert.equal(withHeader.pathname, "/api/demo")

  const generated = buildRequestLogContext(new Request("https://example.test/api/demo"))
  assert.equal(typeof generated.requestId, "string")
  assert.notEqual(generated.requestId, "")
})
