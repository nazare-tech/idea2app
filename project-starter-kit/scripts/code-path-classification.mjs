#!/usr/bin/env node
/**
 * code-path-classification.mjs — the single definition of "code" in this repo.
 *
 * Two consumers share it so review scope and sweep scope can never drift:
 *   - post-commit-review.sh: is this commit worth paid cross-model review?
 *   - sweep-check.mjs: which paths count toward the net +1000-line sweep trigger?
 *
 * EDIT THE THREE CONFIG BLOCKS BELOW when seeding a new project. Narrowing them
 * silently narrows both review and sweep coverage, so change them deliberately.
 *
 * Usage: <paths on stdin> | node scripts/code-path-classification.mjs --reviewable-stdin
 * Exit 0 = at least one reviewable path, 3 = valid classification with none,
 * other non-zero = classifier failure (treated as UNREVIEWED, never as a skip).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// CONFIG 1: directory prefixes whose contents are code.
const REVIEWABLE_PREFIXES = [
  "src/",
  "lib/",
  "app/",
  "scripts/",
  "migrations/",
  "tests/",
  "e2e/",
  ".githooks/",
  ".agents/skills/",
];

// CONFIG 2: individual files that must be reviewed even though they are not
// under a code prefix. Agent rules and build/config manifests belong here:
// changing them changes how everything else is built or reviewed.
const REVIEWABLE_EXACT_PATHS = new Set([
  "AGENTS.md",
  "CLAUDE.md",
  "docs/operating-system/review-personas.md",
  "docs/operating-system/planning-workflow.md",
  "docs/operating-system/doc-conventions.md",
  "package.json",
  "tsconfig.json",
]);

// CONFIG 3: git pathspecs counted by the sweep line counter. Keep in sync with
// CONFIG 1; the exclusions keep docs, lockfiles, and generated output out of
// the +1000 trigger.
export const SWEEP_PATHSPECS = [
  "src",
  "lib",
  "app",
  "scripts",
  "migrations",
  "tests",
  "e2e",
  ".githooks",
  ":(exclude)**/*.md",
  ":(exclude)**/*.lock",
  ":(exclude)package-lock.json",
];

export function isReviewablePath(filePath) {
  return (
    REVIEWABLE_PREFIXES.some((prefix) => filePath.startsWith(prefix)) ||
    REVIEWABLE_EXACT_PATHS.has(filePath)
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv[2] !== "--reviewable-stdin") {
    console.error("usage: code-path-classification.mjs --reviewable-stdin");
    process.exit(2);
  }
  const paths = readFileSync(0, "utf8").split("\n").filter(Boolean);
  // Exit 3 means a valid classification with no reviewable paths. Other
  // non-zero exits remain real classifier failures for the shell runner.
  process.exit(paths.some(isReviewablePath) ? 0 : 3);
}
