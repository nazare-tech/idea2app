import test from "node:test"
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"
import { ReportTable } from "./report-table"

test("ReportTable applies the shared Figma shell and table treatment", () => {
  const html = renderToStaticMarkup(
    <ReportTable
      className="table-fixed"
      wrapperClassName="my-8"
      minWidthClassName="min-w-[720px]"
    >
      <thead>
        <tr>
          <th>Dimension</th>
          <th>Your Idea</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Setup</td>
          <td data-report-table-emphasis>Fast</td>
        </tr>
        <tr>
          <td>Collaboration</td>
          <td data-report-table-emphasis>Focused</td>
        </tr>
      </tbody>
    </ReportTable>
  )

  assert.match(html, /<div[^>]*class="[^"]*my-8[^"]*">/)
  assert.match(html, /<div[^>]*class="[^"]*overflow-x-auto[^"]*">/)
  assert.match(html, /<div[^>]*class="[^"]*rounded[^\s"]*[^"]*border[^"]*">/)
  assert.match(html, /role="region"/)
  assert.match(html, /aria-label="Scrollable report table"/)
  assert.match(html, /tabindex="0"/)
  assert.match(html, /focus-visible:ring-2/)
  assert.match(html, /<table class="[^"]*table-fixed[^"]*">/)
  assert.match(html, /<table class="[^"]*min-w-\[720px\][^"]*">/)
  assert.match(html, /\[&amp;_thead\]:bg-foreground/)
  assert.match(html, /\[&amp;_thead_th\]:text-white/)
  assert.match(html, /\[&amp;_tbody_tr:nth-child\(odd\)\]:bg-card/)
  assert.match(html, /\[&amp;_tbody_tr:nth-child\(even\)\]:bg-secondary\/70/)
  assert.match(html, /\[&amp;_tbody_\[data-report-table-emphasis\]\]:italic/)
  assert.match(html, /data-report-table-emphasis="true"/)
})

test("ReportTable supports the warm header used beneath comparison tabs", () => {
  const html = renderToStaticMarkup(
    <ReportTable headerTone="warm">
      <thead><tr><th>Competitor</th></tr></thead>
      <tbody><tr><td>Example</td></tr></tbody>
    </ReportTable>
  )

  assert.match(html, /\[&amp;_thead\]:bg-secondary\/70/)
  assert.match(html, /\[&amp;_thead_th\]:border-b/)
  assert.match(html, /\[&amp;_thead_th\]:text-foreground/)
  assert.doesNotMatch(html, /\[&amp;_thead\]:bg-foreground/)
})
