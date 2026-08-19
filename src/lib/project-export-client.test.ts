import assert from "node:assert/strict"
import test from "node:test"

import { getAttachmentFileName } from "./project-export-client"

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
