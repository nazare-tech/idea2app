import test from "node:test"
import assert from "node:assert/strict"

import {
  buildField,
  computeShouldAnimate,
  dampAngle,
  protectedZoneAlpha,
} from "./hero-dot-field-core"
import {
  COMPASS_WEDGE_POINTS,
  compassWedgePathD,
  traceCompassWedge,
} from "@/lib/compass-geometry"

const FIELD_OPTS = { width: 1200, height: 600, pitch: 26, seed: 20260802 }

test("buildField is deterministic for a fixed seed", () => {
  const a = buildField(FIELD_OPTS)
  const b = buildField(FIELD_OPTS)
  assert.deepEqual(a, b)
})

test("buildField clusters: keeps a fraction of the lattice, not all or none", () => {
  const field = buildField(FIELD_OPTS)
  const cells = field.cols * field.rows
  assert.ok(field.dots.length > cells * 0.1, `too few dots: ${field.dots.length}/${cells}`)
  assert.ok(field.dots.length < cells * 0.9, `no gaps: ${field.dots.length}/${cells}`)
})

test("buildField wedge sites are sparse, capped, and spaced apart", () => {
  const field = buildField({ ...FIELD_OPTS, wedgeSpacing: 120, wedgeMax: 20 })
  assert.ok(field.wedgeIndices.length > 0, "no wedges picked")
  assert.ok(field.wedgeIndices.length <= 20)
  for (const i of field.wedgeIndices) {
    for (const j of field.wedgeIndices) {
      if (i === j) continue
      const a = field.dots[i]
      const b = field.dots[j]
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 120, `wedges ${i},${j} too close`)
    }
  }
})

test("dampAngle converges to the target", () => {
  let angle = 0
  for (let i = 0; i < 600; i++) angle = dampAngle(angle, 2, 8, 1 / 60)
  assert.ok(Math.abs(angle - 2) < 1e-3)
})

test("dampAngle takes the short arc across the wrap", () => {
  // From just above -π to just below π: the short way crosses the wrap
  // (negative direction), never the long way through 0.
  const start = -Math.PI + 0.1
  const target = Math.PI - 0.1
  const next = dampAngle(start, target, 8, 1 / 60)
  assert.ok(next < start, `expected movement below ${start}, got ${next}`)
})

test("protectedZoneAlpha: 0 inside the rect, 1 far outside, clamped", () => {
  const rect = { left: 400, top: 200, right: 800, bottom: 400 }
  assert.equal(protectedZoneAlpha(600, 300, rect), 0)
  assert.equal(protectedZoneAlpha(0, 0, rect), 1)
  const edge = protectedZoneAlpha(830, 300, rect)
  assert.ok(edge >= 0 && edge <= 1)
})

test("computeShouldAnimate: full transition truth table", () => {
  // [intersecting, hidden, reduced] -> expected
  const cases: Array<[boolean, boolean, boolean, boolean]> = [
    [true, false, false, true],
    [false, false, false, false],
    [true, true, false, false],
    [true, false, true, false],
    [false, true, false, false],
    [false, false, true, false],
    [true, true, true, false],
    [false, true, true, false],
  ]
  for (const [i, h, r, expected] of cases) {
    assert.equal(computeShouldAnimate(i, h, r), expected, `(${i},${h},${r})`)
  }
})

test("compass geometry: path d matches the shared points and canvas trace is centered", () => {
  const d = compassWedgePathD()
  assert.equal(d, "M 843.88 71.68 L 552.47 952.32 L 445.89 708.6 L 180.12 719.65 Z")

  const points: Array<[string, number, number]> = []
  traceCompassWedge(
    {
      moveTo: (x, y) => points.push(["M", x, y]),
      lineTo: (x, y) => points.push(["L", x, y]),
      closePath: () => points.push(["Z", 0, 0]),
    },
    10
  )
  assert.equal(points.length, COMPASS_WEDGE_POINTS.length + 1)
  // Centered on the centroid: vertex mean is ~0, and the longest vertex
  // distance is half the requested size.
  const verts = points.filter(([c]) => c !== "Z")
  const meanX = verts.reduce((s, [, x]) => s + x, 0) / verts.length
  const meanY = verts.reduce((s, [, , y]) => s + y, 0) / verts.length
  assert.ok(Math.abs(meanX) < 1e-9 && Math.abs(meanY) < 1e-9)
  const maxR = Math.max(...verts.map(([, x, y]) => Math.hypot(x, y)))
  assert.ok(Math.abs(maxR - 5) < 1e-9)
})
