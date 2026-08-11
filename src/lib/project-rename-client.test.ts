import assert from "node:assert/strict"
import test from "node:test"

import { requestProjectRename } from "./project-rename-client"

test("requestProjectRename sends normalized input and returns the persisted response name", async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = []
  const name = await requestProjectRename({
    projectId: "project-id",
    draft: "  My\tProject  ",
    fetcher: async (input, init) => {
      calls.push({ input, init })
      return Response.json({ data: { name: "My Project" } })
    },
  })

  assert.equal(name, "My Project")
  assert.equal(calls.length, 1)
  assert.equal(calls[0]?.input, "/api/projects/project-id")
  assert.equal(calls[0]?.init?.method, "PATCH")
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), { name: "My Project" })
})

test("requestProjectRename rejects invalid input before fetch", async () => {
  let called = false
  await assert.rejects(
    requestProjectRename({
      projectId: "project-id",
      draft: " ",
      fetcher: async () => {
        called = true
        return Response.json({})
      },
    }),
    /Project name is required\./,
  )
  assert.equal(called, false)
})

test("requestProjectRename keeps server and network errors generic", async () => {
  await assert.rejects(
    requestProjectRename({
      projectId: "project-id",
      draft: "Valid name",
      fetcher: async () => Response.json({ error: "internal detail" }, { status: 500 }),
    }),
    /Unable to rename project\. Please try again\./,
  )

  await assert.rejects(
    requestProjectRename({
      projectId: "project-id",
      draft: "Valid name",
      fetcher: async () => {
        throw new Error("network detail")
      },
    }),
    /Unable to rename project\. Please try again\./,
  )
})

test("requestProjectRename rejects malformed success payloads", async () => {
  await assert.rejects(
    requestProjectRename({
      projectId: "project-id",
      draft: "Valid name",
      fetcher: async () => Response.json({ data: {} }),
    }),
    /Unable to rename project\. Please try again\./,
  )
})

test("requestProjectRename aborts a request that exceeds its timeout", async () => {
  await assert.rejects(
    requestProjectRename({
      projectId: "project-id",
      draft: "Valid name",
      timeoutMs: 1,
      fetcher: async (_input, init) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))
      }),
    }),
    /Unable to rename project\. Please try again\./,
  )
})
