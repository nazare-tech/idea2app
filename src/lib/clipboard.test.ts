import assert from "node:assert/strict"
import test from "node:test"

import { copyTextToClipboard } from "./clipboard"

const originalNavigator = globalThis.navigator
const originalDocument = globalThis.document

test.afterEach(() => {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: originalNavigator,
  })
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: originalDocument,
  })
})

test("copyTextToClipboard uses async clipboard when available", async () => {
  let copied = ""
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      clipboard: {
        writeText: async (text: string) => {
          copied = text
        },
      },
    },
  })

  const method = await copyTextToClipboard("hello")

  assert.equal(method, "async-clipboard")
  assert.equal(copied, "hello")
})

test("copyTextToClipboard falls back when async clipboard rejects", async () => {
  const appended: Array<{ remove: () => void }> = []
  let execCalled = false

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      clipboard: {
        writeText: async () => {
          throw new Error("denied")
        },
      },
    },
  })
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      body: {
        appendChild: (element: { remove: () => void }) => {
          appended.push(element)
        },
      },
      createElement: () => ({
        value: "",
        style: {},
        focus: () => {},
        remove: () => {},
        select: () => {},
        setAttribute: () => {},
        setSelectionRange: () => {},
      }),
      execCommand: (command: string) => {
        execCalled = command === "copy"
        return true
      },
    },
  })

  const method = await copyTextToClipboard("fallback")

  assert.equal(method, "exec-command")
  assert.equal(execCalled, true)
  assert.equal(appended.length, 1)
})

test("copyTextToClipboard throws when no copy path is available", async () => {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {},
  })
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: undefined,
  })

  await assert.rejects(
    () => copyTextToClipboard("missing"),
    /Clipboard copy is not available/,
  )
})
