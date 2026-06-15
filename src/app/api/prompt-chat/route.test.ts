import assert from "node:assert/strict"
import test from "node:test"

import { GET, POST } from "./route"

test("GET /api/prompt-chat: deprecated route returns 410", async () => {
  const response = await GET()
  const body = await response.json()

  assert.equal(response.status, 410)
  assert.equal(body.error, "Prompt Chat has been deprecated. Use the project Overview instead.")
})

test("POST /api/prompt-chat: deprecated route returns 410", async () => {
  const response = await POST()
  const body = await response.json()

  assert.equal(response.status, 410)
  assert.equal(body.error, "Prompt Chat has been deprecated. Use the project Overview instead.")
})
