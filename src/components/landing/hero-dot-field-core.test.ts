import test from "node:test"
import assert from "node:assert/strict"

import {
  buildField,
  computeShouldAnimate,
  dampAngle,
  magneticLineAngle,
  protectedZoneAlpha,
} from "./hero-dot-field-core"

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

test("magneticLineAngle turns short lines tangent to cursor rings", () => {
  const north = -Math.PI / 2
  // Above a cursor-centered ring, its tangent is horizontal.
  assert.ok(Math.abs(magneticLineAngle(0, -20, 0, 0, 1, north)) < 1e-9)
  // At zero strength and ring center, the resting vertical direction holds.
  assert.equal(magneticLineAngle(0, -20, 0, 0, 0, north), north)
  assert.equal(magneticLineAngle(0, 0, 0, 0, 1, north), north)
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
