#!/usr/bin/env node
/**
 * sweep-check.mjs — report net added lines of code since the last commit sweep.
 *
 * The last sweep is recorded as a commit SHA in docs/reviews/.last-sweep-commit.
 * Net = added − deleted across code paths (see PATHSPECS) for <last-sweep>..HEAD.
 * When net >= threshold (default 1000, override with SWEEP_THRESHOLD), a sweep
 * review is due: run the commit-sweep skill (.agents/skills/commit-sweep).
 *
 * Usage:
 *   node scripts/sweep-check.mjs            # always prints a one-line status
 *   node scripts/sweep-check.mjs --notify   # silent unless a sweep is due (for the post-commit hook)
 *   node scripts/sweep-check.mjs --json     # machine-readable output
 *
 * This script never calls any paid API. It only reads git.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SWEEP_PATHSPECS } from "./code-path-classification.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const MARKER_PATH = join(repoRoot, "docs/reviews/.last-sweep-commit");
const THRESHOLD = Number(process.env.SWEEP_THRESHOLD ?? 1000);

// Code that counts toward the sweep trigger. Docs, evidence, lockfiles, and
// generated artifacts are deliberately excluded.
const args = new Set(process.argv.slice(2));
const git = (...a) =>
  execFileSync("git", a, { cwd: repoRoot, encoding: "utf8" }).trim();

if (!existsSync(MARKER_PATH)) {
  if (!args.has("--notify")) {
    console.log(
      `sweep-check: no marker at docs/reviews/.last-sweep-commit — seed it with a commit SHA to enable sweep tracking.`,
    );
  }
  process.exit(0);
}

const marker = readFileSync(MARKER_PATH, "utf8").split("\n")[0].trim();
try {
  git("cat-file", "-e", `${marker}^{commit}`);
} catch {
  console.error(
    `sweep-check: marker commit ${marker} not found in this repository. Fix docs/reviews/.last-sweep-commit.`,
  );
  process.exit(2);
}

const numstat = git("diff", "--numstat", `${marker}..HEAD`, "--", ...SWEEP_PATHSPECS);
let added = 0;
let deleted = 0;
let files = 0;
for (const line of numstat.split("\n")) {
  if (!line) continue;
  const [a, d] = line.split("\t");
  if (a === "-" || d === "-") continue; // binary
  added += Number(a);
  deleted += Number(d);
  files += 1;
}
const net = added - deleted;
const due = net >= THRESHOLD;
const commits = Number(git("rev-list", "--count", `${marker}..HEAD`));

if (args.has("--json")) {
  console.log(
    JSON.stringify({ marker, commits, files, added, deleted, net, threshold: THRESHOLD, due }),
  );
} else if (args.has("--notify")) {
  if (due) {
    console.log(
      [
        "",
        "############################################################",
        `#  COMMIT SWEEP DUE: net +${net} lines of code since last  `,
        `#  sweep (${marker.slice(0, 8)}, ${commits} commits; threshold ${THRESHOLD}).`,
        "#  Run the commit-sweep skill (.agents/skills/commit-sweep)",
        "#  or: node scripts/sweep-check.mjs for details.",
        "############################################################",
        "",
      ].join("\n"),
    );
  }
} else {
  console.log(
    `sweep-check: net ${net >= 0 ? "+" : ""}${net} lines (+${added}/−${deleted}, ${files} files, ${commits} commits) since ${marker.slice(0, 8)}; threshold ${THRESHOLD} → ${due ? "SWEEP DUE" : "not due"}`,
  );
}
process.exit(0);
