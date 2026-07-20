import test from "node:test"
import assert from "node:assert/strict"

import {
  getTimelineDetail,
  getTimelinePhaseTitle,
  getTimelinePhaseWeekRanges,
  parseTimelinePhaseDetails,
} from "./product-plan-view-model"

test("product-plan view model parses timeline detail groups", () => {
  const details = parseTimelinePhaseDetails(`- **Goal**: Ship the account shell.\n- **Key deliverables**:\n  - Sign in\n  - Private storage`)

  assert.equal(getTimelineDetail(details, ["Goal"])?.body, "Ship the account shell.")
  assert.deepEqual(getTimelineDetail(details, ["Deliverables"])?.bullets, ["Sign in", "Private storage"])
})

test("product-plan view model derives titles and cumulative week ranges", () => {
  assert.equal(getTimelinePhaseTitle("Phase 2: Generation"), "Generation")
  assert.deepEqual(
    getTimelinePhaseWeekRanges([
      { heading: "Phase 1", content: "- **Estimated duration**: 3 weeks" },
      { heading: "Phase 2", content: "- **Duration**: 5 weeks" },
      { heading: "Phase 3", content: "Duration unknown" },
    ]),
    ["Weeks 1-3", "Weeks 4-8", null],
  )
})
