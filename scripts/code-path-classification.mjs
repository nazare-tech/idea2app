#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REVIEWABLE_PREFIXES = [
  "src/",
  "scripts/",
  "supabase/",
  "supabase-migrations/",
  "e2e/",
  ".githooks/",
  ".agents/skills/",
  ".claude/skills/",
];

const REVIEWABLE_EXACT_PATHS = new Set([
  "docs/operating-system/review-personas.md",
  "docs/operating-system/planning-workflow.md",
  "docs/operating-system/doc-conventions.md",
  "AGENTS.md",
  "CLAUDE.md",
  "package.json",
  "tsconfig.json",
]);

export const SWEEP_PATHSPECS = [
  "src",
  "scripts",
  "supabase",
  "supabase-migrations",
  "e2e",
  ".githooks",
  ":(exclude)**/*.md",
  ":(exclude)**/*.lock",
  ":(exclude)package-lock.json",
];

export function isReviewablePath(filePath) {
  return (
    REVIEWABLE_PREFIXES.some((prefix) => filePath.startsWith(prefix)) ||
    REVIEWABLE_EXACT_PATHS.has(filePath) ||
    filePath.startsWith("next.config.")
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
