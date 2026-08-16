import assert from "node:assert/strict"
import test from "node:test"

import { POST } from "./route"

test("legacy Maker research reply endpoint is retired", async () => {
  const response = await POST()
  assert.equal(response.status, 410)
  assert.match(await response.text(), /standalone local Research Inbox/i)
})
