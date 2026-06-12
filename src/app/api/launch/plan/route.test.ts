import assert from "node:assert/strict"
import test from "node:test"

import { POST } from "./route"

test("POST /api/launch/plan: archived route returns 410 without credits", async () => {
  const response = await POST(new Request("http://localhost/api/launch/plan", { method: "POST" }))
  const body = await response.json()

  assert.equal(response.status, 410)
  assert.equal(body.archived, true)
  assert.equal(body.creditsConsumed, 0)
})
