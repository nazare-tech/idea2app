import assert from "node:assert/strict"
import test from "node:test"

import { createZipArchive } from "./zip"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function findSignature(bytes: Uint8Array, signature: number) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  for (let offset = 0; offset <= bytes.byteLength - 4; offset += 1) {
    if (view.getUint32(offset, true) === signature) return offset
  }
  return -1
}

test("createZipArchive writes readable local and central directory records", () => {
  const first = encoder.encode("hello\n")
  const second = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
  const archive = createZipArchive([
    { path: "sample/documents/readme.md", data: first, modifiedAt: new Date("2026-08-19T12:00:00Z") },
    { path: "sample/mockups/concept-1.png", data: second, modifiedAt: new Date("2026-08-19T12:00:00Z") },
  ])
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength)

  assert.equal(view.getUint32(0, true), 0x04034b50)
  assert.equal(view.getUint16(8, true), 0)
  assert.equal(view.getUint32(18, true), first.byteLength)
  const firstNameLength = view.getUint16(26, true)
  assert.equal(decoder.decode(archive.slice(30, 30 + firstNameLength)), "sample/documents/readme.md")
  assert.deepEqual(
    archive.slice(30 + firstNameLength, 30 + firstNameLength + first.byteLength),
    first,
  )

  const centralOffset = findSignature(archive, 0x02014b50)
  const endOffset = findSignature(archive, 0x06054b50)
  assert.ok(centralOffset > 0)
  assert.ok(endOffset > centralOffset)
  assert.equal(view.getUint16(endOffset + 10, true), 2)
  assert.equal(view.getUint32(endOffset + 16, true), centralOffset)
})

test("createZipArchive rejects traversal, duplicate, and empty archives", () => {
  assert.throws(() => createZipArchive([]), /at least one file/)
  assert.throws(
    () => createZipArchive([{ path: "../secret.txt", data: encoder.encode("x") }]),
    /Invalid ZIP entry path/,
  )
  assert.throws(
    () => createZipArchive([
      { path: "same.txt", data: encoder.encode("x") },
      { path: "same.txt", data: encoder.encode("y") },
    ]),
    /Duplicate ZIP entry path/,
  )
})
