import test from "node:test"
import assert from "node:assert/strict"
import { extractMockupOptions, hasThreeOptionProsConsContract } from "./mockup-format-contract"

const fixture = `### Option A - Dashboard Focus
Pros:
- Clear hero hierarchy
- Good CTA placement
Cons:
- Dense first fold
- Needs responsive tuning
\`\`\`json
{"root":"r1","elements":{"r1":{"type":"Stack","children":[]}}}
\`\`\`

### Option B - Workflow Focus
Pros:
- Progressive disclosure
- Better scanning for tasks
Cons:
- More clicks for power users
- Requires state management
\`\`\`json
{"root":"r2","elements":{"r2":{"type":"Stack","children":[]}}}
\`\`\`

### Option C - Data Focus
Pros:
- Highlights key metrics
- Fast status visibility
Cons:
- Needs data freshness guarantees
- More backend coupling
\`\`\`json
{"root":"r3","elements":{"r3":{"type":"Stack","children":[]}}}
\`\`\`
`

test("extractMockupOptions returns 3 options with pros/cons/json", () => {
  const options = extractMockupOptions(fixture)
  assert.equal(options.length, 3)
  assert.deepEqual(options.map(o => o.label), ["A", "B", "C"])
  options.forEach((option) => {
    assert.ok(option.pros.length >= 1)
    assert.ok(option.cons.length >= 1)
    assert.match(option.json, /```json[\s\S]*```/i)
  })
})

test("hasThreeOptionProsConsContract enforces 3-option contract", () => {
  assert.equal(hasThreeOptionProsConsContract(fixture), true)

  const broken = fixture.replace("Cons:\n- Dense first fold\n- Needs responsive tuning\n", "")
  assert.equal(hasThreeOptionProsConsContract(broken), false)
})
