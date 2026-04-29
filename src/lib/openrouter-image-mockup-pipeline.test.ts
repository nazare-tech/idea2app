import test from "node:test"
import assert from "node:assert/strict"

import {
  buildMockupImageProxyUrl,
  extractImageDataUrlFromOpenRouterChoice,
  parseImageDataUrl,
  parseOpenRouterImageMockupContent,
} from "./openrouter-image-mockup-pipeline"

test("parseImageDataUrl: decodes supported image data URLs", () => {
  const parsed = parseImageDataUrl("data:image/png;base64,aGVsbG8=")

  assert.equal(parsed.contentType, "image/png")
  assert.equal(parsed.extension, "png")
  assert.equal(parsed.buffer.toString("utf8"), "hello")
})

test("parseImageDataUrl: rejects non-image data URLs", () => {
  assert.throws(
    () => parseImageDataUrl("data:text/plain;base64,aGVsbG8="),
    /Unsupported image data URL/,
  )
})

test("parseImageDataUrl: rejects images larger than storage limit", () => {
  const oversized = Buffer.alloc((10 * 1024 * 1024) + 1).toString("base64")

  assert.throws(
    () => parseImageDataUrl(`data:image/png;base64,${oversized}`),
    /larger than the 10 MB storage limit/,
  )
})

test("extractImageDataUrlFromOpenRouterChoice: supports snake_case image payloads", () => {
  const imageUrl = extractImageDataUrlFromOpenRouterChoice({
    message: {
      images: [
        {
          image_url: {
            url: "data:image/webp;base64,abc",
          },
        },
      ],
    },
  })

  assert.equal(imageUrl, "data:image/webp;base64,abc")
})

test("extractImageDataUrlFromOpenRouterChoice: supports camelCase image payloads", () => {
  const imageUrl = extractImageDataUrlFromOpenRouterChoice({
    message: {
      images: [
        {
          imageUrl: {
            url: "data:image/jpeg;base64,abc",
          },
        },
      ],
    },
  })

  assert.equal(imageUrl, "data:image/jpeg;base64,abc")
})

test("buildMockupImageProxyUrl: encodes project and storage path", () => {
  const url = buildMockupImageProxyUrl({
    projectId: "project 1",
    storagePath: "project 1/run/option-a.png",
  })

  assert.equal(
    url,
    "/api/mockups/image?projectId=project+1&path=project+1%2Frun%2Foption-a.png",
  )
})

test("parseOpenRouterImageMockupContent: returns normalized options", () => {
  const parsed = parseOpenRouterImageMockupContent(JSON.stringify({
    type: "openrouter-image",
    model: "openai/gpt-5.4-image-2",
    options: [
      {
        label: "A",
        title: "Option A",
        imageUrl: "/api/mockups/image?projectId=p&path=p%2Fr%2Fa.png",
        storagePath: "p/r/a.png",
        description: "Primary option",
      },
    ],
  }))

  assert.equal(parsed?.type, "openrouter-image")
  assert.equal(parsed?.options[0]?.label, "A")
  assert.equal(parsed?.options[0]?.storagePath, "p/r/a.png")
})
