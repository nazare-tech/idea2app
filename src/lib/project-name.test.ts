import assert from "node:assert/strict"
import test from "node:test"

import {
  PROJECT_NAME_MAX_LENGTH,
  validateProjectName,
} from "./project-name"

test("validateProjectName normalizes compatible text and collapses whitespace", () => {
  assert.deepEqual(validateProjectName("  My\tﬁrst\nProject  "), {
    ok: true,
    name: "My first Project",
  })
})

test("validateProjectName removes unsafe controls but preserves ZWNJ and ZWJ", () => {
  assert.deepEqual(validateProjectName("Alpha\u061C\u200E\u200F\u202E\u2060\u200B\uFEFF Beta"), {
    ok: true,
    name: "Alpha Beta",
  })
  assert.deepEqual(validateProjectName("می\u200Cروم 👨\u200D👩\u200D👧"), {
    ok: true,
    name: "می\u200Cروم 👨\u200D👩\u200D👧",
  })
})

test("validateProjectName rejects non-string and blank values", () => {
  assert.deepEqual(validateProjectName(null), {
    ok: false,
    error: "Project name is required.",
  })
  assert.deepEqual(validateProjectName(" \u0000\u200B "), {
    ok: false,
    error: "Project name is required.",
  })
})

test("validateProjectName accepts exactly 80 UTF-16 code units and rejects 81", () => {
  assert.equal(validateProjectName("a".repeat(PROJECT_NAME_MAX_LENGTH)).ok, true)
  assert.deepEqual(validateProjectName("a".repeat(PROJECT_NAME_MAX_LENGTH + 1)), {
    ok: false,
    error: "Project names can be up to 80 characters.",
  })
})

test("validateProjectName measures after NFKC expansion", () => {
  const result = validateProjectName(`a${"㍿".repeat(20)}`)
  assert.deepEqual(result, {
    ok: false,
    error: "Project names can be up to 80 characters.",
  })
})

test("validateProjectName never truncates or splits an astral character", () => {
  assert.equal(validateProjectName(`${"a".repeat(78)}😀`).ok, true)
  assert.deepEqual(validateProjectName(`${"a".repeat(79)}😀`), {
    ok: false,
    error: "Project names can be up to 80 characters.",
  })
})
