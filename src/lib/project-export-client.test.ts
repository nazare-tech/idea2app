import assert from "node:assert/strict"
import test from "node:test"

import {
  downloadProjectExport,
  getAttachmentFileName,
  ProjectExportError,
} from "./project-export-client"

test("getAttachmentFileName accepts safe ZIP attachment names", () => {
  assert.equal(
    getAttachmentFileName('attachment; filename="maker-compass-export-2026-08-19.zip"'),
    "maker-compass-export-2026-08-19.zip",
  )
  assert.equal(getAttachmentFileName("attachment; filename=project.zip"), "project.zip")
})

test("getAttachmentFileName rejects traversal, controls, and non-ZIP responses", () => {
  assert.equal(getAttachmentFileName('attachment; filename="../secret.zip"'), null)
  assert.equal(getAttachmentFileName('attachment; filename="project.pdf"'), null)
  assert.equal(getAttachmentFileName("inline"), null)
})

test("downloadProjectExport classifies invalid and empty archives", async () => {
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response("not a zip", {
      headers: { "Content-Type": "text/plain" },
    })
    await assert.rejects(
      () => downloadProjectExport({ projectId: "project-1", projectName: "Maker Compass" }),
      (error) => error instanceof ProjectExportError && error.kind === "archive",
    )

    globalThis.fetch = async () => new Response(new Uint8Array(), {
      headers: { "Content-Type": "application/zip" },
    })
    await assert.rejects(
      () => downloadProjectExport({ projectId: "project-1", projectName: "Maker Compass" }),
      (error) => error instanceof ProjectExportError && error.kind === "archive",
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("downloadProjectExport starts a download before revoking its object URL", async () => {
  const originalFetch = globalThis.fetch
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document")
  const createObjectUrlDescriptor = Object.getOwnPropertyDescriptor(URL, "createObjectURL")
  const revokeObjectUrlDescriptor = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL")
  const originalSetTimeout = globalThis.setTimeout
  const originalClearTimeout = globalThis.clearTimeout
  const scheduled: Array<() => void> = []
  const calls: string[] = []

  try {
    globalThis.fetch = async () => new Response(new Uint8Array([1, 2, 3]), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="maker-compass-export-2026-08-19.zip"',
      },
    })
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: () => "blob:project-export",
    })
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: () => calls.push("revoke"),
    })
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        body: { appendChild: () => calls.push("append") },
        createElement: () => ({
          href: "",
          download: "",
          click: () => calls.push("click"),
          remove: () => calls.push("remove"),
        }),
      },
    })
    globalThis.setTimeout = ((callback: () => void) => {
      scheduled.push(callback)
      return scheduled.length as unknown as ReturnType<typeof setTimeout>
    }) as typeof setTimeout
    globalThis.clearTimeout = (() => undefined) as typeof clearTimeout

    const fileName = await downloadProjectExport({
      projectId: "project-1",
      projectName: "Maker Compass",
    })

    assert.equal(fileName, "maker-compass-export-2026-08-19.zip")
    assert.deepEqual(calls, ["append", "click", "remove"])
    scheduled.at(-1)?.()
    assert.deepEqual(calls, ["append", "click", "remove", "revoke"])
  } finally {
    globalThis.fetch = originalFetch
    if (documentDescriptor) Object.defineProperty(globalThis, "document", documentDescriptor)
    else Reflect.deleteProperty(globalThis, "document")
    if (createObjectUrlDescriptor) Object.defineProperty(URL, "createObjectURL", createObjectUrlDescriptor)
    else Reflect.deleteProperty(URL, "createObjectURL")
    if (revokeObjectUrlDescriptor) Object.defineProperty(URL, "revokeObjectURL", revokeObjectUrlDescriptor)
    else Reflect.deleteProperty(URL, "revokeObjectURL")
    globalThis.setTimeout = originalSetTimeout
    globalThis.clearTimeout = originalClearTimeout
  }
})
