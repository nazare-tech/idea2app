import assert from "node:assert/strict"
import test from "node:test"

import { parseDocumentStream } from "./parse-document-stream"

const originalWarn = console.warn
const originalNodeEnv = process.env.NODE_ENV

test.afterEach(() => {
  console.warn = originalWarn
  Reflect.set(process.env, "NODE_ENV", originalNodeEnv)
})

function buildResponse(body: string): Response {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body))
        controller.close()
      },
    }),
  )
}

test("parseDocumentStream warns on malformed NDJSON in development", async () => {
  Reflect.set(process.env, "NODE_ENV", "development")
  const warnings: unknown[][] = []
  console.warn = (...args: unknown[]) => {
    warnings.push(args)
  }
  const doneModels: string[] = []

  await parseDocumentStream(
    buildResponse("not-json\n{\"type\":\"done\",\"model\":\"gpt-test\"}\n"),
    {
      onStage: () => {},
      onToken: () => {},
      onDone: (model) => doneModels.push(model),
      onError: () => {},
    },
  )

  assert.deepEqual(doneModels, ["gpt-test"])
  assert.equal(warnings.length, 1)
  assert.equal(warnings[0][0], "[parseDocumentStream] Skipped malformed NDJSON line:")
  assert.equal(warnings[0][1], "not-json")
})

test("parseDocumentStream stays quiet on malformed NDJSON outside development", async () => {
  Reflect.set(process.env, "NODE_ENV", "production")
  const warnings: unknown[][] = []
  console.warn = (...args: unknown[]) => {
    warnings.push(args)
  }

  await parseDocumentStream(
    buildResponse("not-json\n{\"type\":\"done\",\"model\":\"gpt-test\"}\n"),
    {
      onStage: () => {},
      onToken: () => {},
      onDone: () => {},
      onError: () => {},
    },
  )

  assert.deepEqual(warnings, [])
})
