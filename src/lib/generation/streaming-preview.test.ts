import assert from "node:assert/strict"
import test from "node:test"

import {
  buildStreamingPreviewPayload,
  encodeStreamingPreviewLengths,
  mergeStreamingPreview,
  parseStreamingPreviewLengths,
} from "./streaming-preview"

test("no client state gets the full content", () => {
  assert.deepEqual(buildStreamingPreviewPayload("prd", "abcdef", undefined), {
    docType: "prd",
    mode: "full",
    content: "abcdef",
  })
})

test("a longer server body sends only the suffix", () => {
  assert.deepEqual(buildStreamingPreviewPayload("prd", "abcdef", 4), {
    docType: "prd",
    mode: "suffix",
    baseLength: 4,
    content: "ef",
  })
})

test("equal lengths resend nothing", () => {
  assert.deepEqual(buildStreamingPreviewPayload("prd", "abcd", 4), {
    docType: "prd",
    mode: "unchanged",
    totalLength: 4,
  })
})

test("a shorter server body (replaced run) sends full content", () => {
  assert.deepEqual(buildStreamingPreviewPayload("prd", "ab", 4), {
    docType: "prd",
    mode: "full",
    content: "ab",
  })
})

test("length round trip encodes non-empty previews and ignores junk", () => {
  const encoded = encodeStreamingPreviewLengths({ competitive: "abc", prd: "", mvp: "defgh" })
  assert.equal(encoded, "competitive:3,mvp:5")
  assert.deepEqual(parseStreamingPreviewLengths(encoded), { competitive: 3, mvp: 5 })
  assert.deepEqual(parseStreamingPreviewLengths("bogus:9,prd:notanumber,mvp:-2"), {})
  assert.deepEqual(parseStreamingPreviewLengths(null), {})
})

test("suffix merge appends only at the exact base length", () => {
  const previous = { prd: "abcd" }
  assert.deepEqual(
    mergeStreamingPreview(previous, { docType: "prd", mode: "suffix", baseLength: 4, content: "ef" }),
    { prd: "abcdef" },
  )
  // Desync (base mismatch) keeps existing state; next poll self-heals.
  assert.equal(
    mergeStreamingPreview(previous, { docType: "prd", mode: "suffix", baseLength: 3, content: "x" }),
    previous,
  )
})

test("full merge replaces content, including a shorter replaced run", () => {
  assert.deepEqual(
    mergeStreamingPreview({ prd: "old long content" }, { docType: "prd", mode: "full", content: "new" }),
    { prd: "new" },
  )
})

test("unchanged and invalid payloads keep previous state", () => {
  const previous = { prd: "abcd" }
  assert.equal(mergeStreamingPreview(previous, { docType: "prd", mode: "unchanged", totalLength: 4 }), previous)
  assert.equal(mergeStreamingPreview(previous, null), previous)
  assert.equal(mergeStreamingPreview(previous, { docType: "launch", content: "x" }), previous)
  assert.equal(mergeStreamingPreview(previous, { docType: "prd", mode: "full", content: "" }), previous)
})

test("legacy payloads without a mode keep longest-wins semantics", () => {
  const previous = { prd: "abcd" }
  assert.equal(mergeStreamingPreview(previous, { docType: "prd", content: "ab" }), previous)
  assert.deepEqual(mergeStreamingPreview(previous, { docType: "prd", content: "abcdef" }), { prd: "abcdef" })
})
