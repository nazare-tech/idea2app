import test from "node:test"
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"

import { CompetitiveStreamingDocument } from "@/components/analysis/competitive-streaming-document"

test("live Market Research stream fills active designed blocks and keeps later skeletons", () => {
  const content = [
    "## Executive Summary",
    "",
    "A focused wedge can win this market.",
    "",
    "## Direct Competitors",
    "",
    "### Competitor One",
    "- **Overview**: Broad workflow suite",
    "- **Core Product/Service**: Planning software",
    "- **Market Positioning**: Generalist",
  ].join("\n")

  const html = renderToStaticMarkup(
    <CompetitiveStreamingDocument
      content={content}
      finished={false}
      parts="detail"
      smoothTail={false}
      competitorSources={[{ name: "Competitor One", url: "https://competitor-one.example.com" }]}
    />,
  )

  assert.match(html, /Market Research/)
  assert.match(html, /Competitor One/)
  assert.match(html, /Broad workflow suite/)
  assert.match(html, /href="https:\/\/competitor-one\.example\.com\//)
  assert.match(html, /Market Landscape/)
  assert.match(html, /02 \/ 12/)
})

test("live Executive Summary uses designed content after first body text", () => {
  const html = renderToStaticMarkup(
    <CompetitiveStreamingDocument
      content={"## Executive Summary\n\nA focused wedge can win this market."}
      finished={false}
      parts="overview"
      projectName="Example Product"
      smoothTail={false}
    />,
  )

  assert.match(html, /Executive Summary/)
  assert.match(html, /Example Product/)
  assert.match(html, /A focused wedge can win this market\./)
})
