import assert from "node:assert/strict"
import test from "node:test"

import { readRequestTextWithLimit, RequestBodyTooLargeError } from "@/lib/read-request-body"

test("reads a request body without changing its text", async () => {
  const request = new Request("http://localhost/test", { method: "POST", body: "hello ✓" })
  assert.equal(await readRequestTextWithLimit(request, 32), "hello ✓")
})

test("rejects a streamed body once actual bytes exceed the cap", async () => {
  const request = new Request("http://localhost/test", { method: "POST", body: "123456" })
  await assert.rejects(readRequestTextWithLimit(request, 5), RequestBodyTooLargeError)
})

test("rejects an oversized declared content length before reading", async () => {
  const request = new Request("http://localhost/test", {
    method: "POST",
    headers: { "content-length": "99" },
    body: "small",
  })
  await assert.rejects(readRequestTextWithLimit(request, 10), RequestBodyTooLargeError)
})
