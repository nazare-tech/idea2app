import assert from "node:assert/strict"
import test from "node:test"

import { createZipArchive, createZipArchiveStream } from "./zip"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function findSignature(bytes: Uint8Array, signature: number) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  for (let offset = 0; offset <= bytes.byteLength - 4; offset += 1) {
    if (view.getUint32(offset, true) === signature) return offset
  }
  return -1
}

function readStoredEntries(archive: Uint8Array) {
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength)
  const endOffset = findSignature(archive, 0x06054b50)
  assert.ok(endOffset >= 0)
  const entryCount = view.getUint16(endOffset + 10, true)
  let centralOffset = view.getUint32(endOffset + 16, true)
  const entries = new Map<string, Uint8Array>()

  for (let index = 0; index < entryCount; index += 1) {
    assert.equal(view.getUint32(centralOffset, true), 0x02014b50)
    const compressedSize = view.getUint32(centralOffset + 20, true)
    const nameLength = view.getUint16(centralOffset + 28, true)
    const extraLength = view.getUint16(centralOffset + 30, true)
    const commentLength = view.getUint16(centralOffset + 32, true)
    const localOffset = view.getUint32(centralOffset + 42, true)
    const name = decoder.decode(archive.slice(centralOffset + 46, centralOffset + 46 + nameLength))

    assert.equal(view.getUint32(localOffset, true), 0x04034b50)
    const localNameLength = view.getUint16(localOffset + 26, true)
    const localExtraLength = view.getUint16(localOffset + 28, true)
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength
    entries.set(name, archive.slice(dataOffset, dataOffset + compressedSize))
    centralOffset += 46 + nameLength + extraLength + commentLength
  }

  return entries
}

test("createZipArchive writes readable local and central directory records", () => {
  // "123456789" is the standard CRC-32 check vector (0xcbf43926).
  const first = encoder.encode("123456789")
  const second = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
  const archive = createZipArchive([
    { path: "sample/documents/readme.md", data: first, modifiedAt: new Date("2026-08-19T12:00:00Z") },
    { path: "sample/mockups/concept-1.png", data: second, modifiedAt: new Date("2026-08-19T12:00:00Z") },
  ])
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength)

  assert.equal(view.getUint32(0, true), 0x04034b50)
  assert.equal(view.getUint16(8, true), 0)
  assert.equal(view.getUint32(14, true), 0xcbf43926)
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
  assert.deepEqual(readStoredEntries(archive), new Map([
    ["sample/documents/readme.md", first],
    ["sample/mockups/concept-1.png", second],
  ]))
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

test("createZipArchiveStream emits the same complete archive incrementally", async () => {
  const entries = [
    { path: "sample/readme.md", data: encoder.encode("hello\n") },
    { path: "sample/image.png", data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) },
  ]
  const buffered = createZipArchive(entries)
  const streamed = new Uint8Array(
    await new Response(createZipArchiveStream(entries)).arrayBuffer(),
  )

  assert.deepEqual(streamed, buffered)
})
