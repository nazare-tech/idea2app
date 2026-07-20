#!/usr/bin/env bash
# post-commit-review.sh — review one immutable code commit with the opposite CLI.
#
# Usage: scripts/post-commit-review.sh [commit-sha]
#
# The runner writes local evidence to .git/agent-reviews/<sha>.{json,txt,stderr}.
# It never edits tracked files. Findings are a successful review outcome; reviewer
# outages return non-zero so the post-commit hook and active agent can report them.
set -u
umask 077

cd "$(dirname "$0")/.."

COMMIT="${1:-HEAD}"
if ! COMMIT="$(git rev-parse --verify --quiet "${COMMIT}^{commit}")"; then
  printf 'post-commit-review: unknown commit %s; nothing recorded\n' "${1:-HEAD}" >&2
  exit 2
fi
REVIEW_DIR="$(git rev-parse --absolute-git-dir)/agent-reviews"
mkdir -p "$REVIEW_DIR"

OUTPUT_PATH="${REVIEW_DIR}/${COMMIT}.txt"
STDERR_PATH="${REVIEW_DIR}/${COMMIT}.stderr"
STATUS_PATH="${REVIEW_DIR}/${COMMIT}.json"
TEMP_OUTPUT="${REVIEW_DIR}/${COMMIT}.tmp"
SNAPSHOT_ROOT=""
REVIEW_PID=""
WATCHDOG_PID=""
PATCH_ID=""
PARENT_COMMIT=""
TREE_ID=""
DUPLICATE_OF=""

cleanup() {
  if [ -n "$SNAPSHOT_ROOT" ] && [ -d "$SNAPSHOT_ROOT" ]; then
    case "$SNAPSHOT_ROOT" in
      "${TMPDIR:-/tmp}"/agent-review.*) rm -rf "$SNAPSHOT_ROOT" ;;
    esac
  fi
}

handle_signal() {
  if [ -n "$WATCHDOG_PID" ]; then
    kill "$WATCHDOG_PID" 2>/dev/null || true
    wait "$WATCHDOG_PID" 2>/dev/null || true
    WATCHDOG_PID=""
  fi
  if [ -n "$REVIEW_PID" ]; then
    kill -TERM "-$REVIEW_PID" 2>/dev/null || true
    sleep 1
    kill -KILL "-$REVIEW_PID" 2>/dev/null || true
    wait "$REVIEW_PID" 2>/dev/null || true
    REVIEW_PID=""
  fi
  exit 130
}

trap cleanup EXIT
trap handle_signal INT TERM

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

write_status() {
  local status="$1"
  local implementer="$2"
  local reviewer="$3"
  local failure_class="${4:-}"
  local reason="${5:-}"

  STATUS="$status" \
  REVIEW_IMPLEMENTER="$implementer" \
  REVIEWER="$reviewer" \
  FAILURE_CLASS="$failure_class" \
  REVIEW_REASON="$reason" \
  REVIEW_COMMIT="$COMMIT" \
  REVIEW_PATCH_ID="$PATCH_ID" \
  REVIEW_PARENT="$PARENT_COMMIT" \
  REVIEW_TREE="$TREE_ID" \
  REVIEW_DUPLICATE_OF="$DUPLICATE_OF" \
  REVIEW_TIMESTAMP="$(timestamp)" \
    node -e '
      const fs = require("node:fs")
      const value = {
        commit: process.env.REVIEW_COMMIT,
        implementer: process.env.REVIEW_IMPLEMENTER,
        reviewer: process.env.REVIEWER || null,
        status: process.env.STATUS,
        timestamp: process.env.REVIEW_TIMESTAMP,
      }
      if (process.env.FAILURE_CLASS) value.failureClass = process.env.FAILURE_CLASS
      if (process.env.REVIEW_REASON) value.reason = process.env.REVIEW_REASON
      if (process.env.REVIEW_PATCH_ID) value.patchId = process.env.REVIEW_PATCH_ID
      if (process.env.REVIEW_PARENT) value.parent = process.env.REVIEW_PARENT
      if (process.env.REVIEW_TREE) value.tree = process.env.REVIEW_TREE
      if (process.env.REVIEW_DUPLICATE_OF) value.duplicateOf = process.env.REVIEW_DUPLICATE_OF
      const target = process.argv[1]
      const temporary = `${target}.${process.pid}.tmp`
      fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`)
      fs.renameSync(temporary, target)
    ' "$STATUS_PATH"
}

resolve_implementer() {
  if [ -n "${AGENT_IMPLEMENTER:-}" ]; then
    case "$AGENT_IMPLEMENTER" in
      codex|claude) printf '%s\n' "$AGENT_IMPLEMENTER"; return 0 ;;
      *) return 1 ;;
    esac
  fi
  if [ "${CLAUDECODE:-}" = "1" ]; then
    printf '%s\n' "claude"
    return 0
  fi
  if [ -n "${CODEX_THREAD_ID:-}" ]; then
    printf '%s\n' "codex"
    return 0
  fi
  return 1
}

reviewer_for() {
  if [ "$1" = "codex" ]; then printf '%s\n' "claude"; else printf '%s\n' "codex"; fi
}

changed_files() {
  if git rev-parse "${COMMIT}^" >/dev/null 2>&1; then
    git diff --name-only "${COMMIT}^" "$COMMIT"
  else
    git diff-tree --root --no-commit-id --name-only -r "$COMMIT"
  fi
}

has_reviewable_paths() {
  changed_files | node scripts/code-path-classification.mjs --reviewable-stdin
}

find_reusable_review() {
  REVIEW_DIR="$REVIEW_DIR" \
  REVIEW_COMMIT="$COMMIT" \
  REVIEW_PATCH_ID="$PATCH_ID" \
  REVIEW_PARENT="$PARENT_COMMIT" \
  REVIEW_TREE="$TREE_ID" \
  REVIEWER="$REVIEWER" \
    node -e '
      const fs = require("node:fs")
      const path = require("node:path")
      let entries = []
      try { entries = fs.readdirSync(process.env.REVIEW_DIR).filter((name) => name.endsWith(".json")).sort() } catch {}
      // Artifacts are only opened for entries whose cheap metadata already
      // matches, so a long-lived ledger costs one JSON parse per entry, not
      // a full artifact read; oversized artifacts are skipped via stat.
      const MAX_ARTIFACT_BYTES = 5_000_000
      for (const name of entries) {
        try {
          const value = JSON.parse(fs.readFileSync(path.join(process.env.REVIEW_DIR, name), "utf8"))
          const validCommit = /^[0-9a-f]{40,64}$/.test(value.commit ?? "")
          if (
            !validCommit ||
            value.commit === process.env.REVIEW_COMMIT ||
            value.patchId !== process.env.REVIEW_PATCH_ID ||
            value.parent !== process.env.REVIEW_PARENT ||
            value.tree !== process.env.REVIEW_TREE ||
            value.reviewer !== process.env.REVIEWER ||
            (value.status !== "passed" && value.status !== "findings")
          ) continue
          const artifactPath = path.join(process.env.REVIEW_DIR, `${value.commit}.txt`)
          if (fs.statSync(artifactPath).size > MAX_ARTIFACT_BYTES) continue
          const artifact = fs.readFileSync(artifactPath, "utf8").trim()
          const artifactValid = value.status === "passed"
            ? artifact === "NO FINDINGS"
            : artifact.length > 0 && artifact !== "NO FINDINGS"
          if (artifactValid) {
            process.stdout.write(`${value.commit}\t${value.status}\n`)
            process.exit(0)
          }
        } catch {}
      }
      process.exit(1)
    '
}

classify_failure() {
  local failure_text
  failure_text="$(cat "$STDERR_PATH" "$OUTPUT_PATH" 2>/dev/null || true)"
  if printf '%s' "$failure_text" | grep -Eqi 'usage[ _-]?limit|quota|credit balance|out of.*tokens'; then
    printf '%s\n' "usage_limit"
  elif printf '%s' "$failure_text" | grep -Eqi 'unable to connect|connection refused|connectionrefused|network|econn|dns'; then
    printf '%s\n' "network"
  elif printf '%s' "$failure_text" | grep -Eqi 'rate[ _-]?limit|too many requests|(^|[^0-9])429([^0-9]|$)'; then
    printf '%s\n' "rate_limit"
  elif printf '%s' "$failure_text" | grep -Eqi 'unauthorized|authentication|not logged in|(^|[^0-9])401([^0-9]|$)'; then
    printf '%s\n' "auth"
  elif printf '%s' "$failure_text" | grep -Eqi 'review input exceeds'; then
    printf '%s\n' "input_too_large"
  elif printf '%s' "$failure_text" | grep -Eqi 'secret-like material'; then
    printf '%s\n' "sensitive_input"
  else
    printf '%s\n' "reviewer_error"
  fi
}

if ! IMPLEMENTER="$(resolve_implementer)"; then
  IMPLEMENTER=""
fi
REVIEWER=""
if [ -n "$IMPLEMENTER" ]; then
  REVIEWER="$(reviewer_for "$IMPLEMENTER")"
fi

has_reviewable_paths
CLASSIFICATION_STATUS=$?
case "$CLASSIFICATION_STATUS" in
  0) ;;
  3)
    write_status "skipped" "${IMPLEMENTER:-unknown}" "$REVIEWER" "" "no_reviewable_paths"
    printf 'agent-review: SKIPPED %s — no reviewable code paths\n' "$COMMIT" >&2
    exit 0
    ;;
  *)
    write_status "failed" "${IMPLEMENTER:-unknown}" "$REVIEWER" "path_classification_error"
    printf 'agent-review: FAILED %s — code-path classification failed; commit is NOT REVIEWED\n' "$COMMIT" >&2
    exit 2
    ;;
esac

# A code commit without a resolvable implementer is an unreviewed commit, not a
# quiet skip: exit non-zero so the post-commit hook reports it loudly.
if [ -z "$IMPLEMENTER" ]; then
  write_status "skipped" "unknown" "" "" "unknown_implementer"
  printf 'agent-review: SKIPPED %s — unknown implementer; commit is NOT REVIEWED. Set AGENT_IMPLEMENTER=codex|claude and rerun scripts/post-commit-review.sh %s\n' "$COMMIT" "$COMMIT" >&2
  exit 1
fi

if [ "${SKIP_AGENT_REVIEW:-}" = "1" ]; then
  write_status "skipped" "$IMPLEMENTER" "$REVIEWER" "" "explicit_skip"
  printf 'agent-review: SKIPPED %s — SKIP_AGENT_REVIEW=1\n' "$COMMIT" >&2
  exit 0
fi

if git rev-parse "${COMMIT}^" >/dev/null 2>&1; then
  PARENT_COMMIT="$(git rev-parse "${COMMIT}^")"
  REVIEW_RANGE="${COMMIT}^..${COMMIT}"
else
  EMPTY_TREE="$(git hash-object -t tree /dev/null)"
  PARENT_COMMIT="$EMPTY_TREE"
  REVIEW_RANGE="${EMPTY_TREE}..${COMMIT}"
fi
TREE_ID="$(git rev-parse "${COMMIT}^{tree}")"

# Stable patch identity is optional. Any calculation or ledger ambiguity falls
# through to a fresh review instead of risking an unsafe skip.
PATCH_ID="$(git show --format= --binary "$COMMIT" 2>/dev/null | git patch-id --stable 2>/dev/null | awk 'NR == 1 { print $1 }' || true)"
if [ -n "$PATCH_ID" ]; then
  REUSABLE_REVIEW="$(find_reusable_review 2>/dev/null || true)"
  if [ -n "$REUSABLE_REVIEW" ]; then
    DUPLICATE_COMMIT="${REUSABLE_REVIEW%%	*}"
    DUPLICATE_STATUS="${REUSABLE_REVIEW#*	}"
    if [ "$DUPLICATE_COMMIT" != "$REUSABLE_REVIEW" ] &&
       { [ "$DUPLICATE_STATUS" = "passed" ] || [ "$DUPLICATE_STATUS" = "findings" ]; }; then
      DUPLICATE_OF="$DUPLICATE_COMMIT"
      if cp "${REVIEW_DIR}/${DUPLICATE_COMMIT}.txt" "$OUTPUT_PATH"; then
        : >"$STDERR_PATH"
        write_status "$DUPLICATE_STATUS" "$IMPLEMENTER" "$REVIEWER" "" "duplicate_patch"
        printf 'agent-review: REUSED %s — same patch as %s (%s reviewed %s)\n' \
          "$COMMIT" "$DUPLICATE_COMMIT" "$REVIEWER" "$IMPLEMENTER" >&2
        exit 0
      fi
      # Source artifact disappeared between lookup and copy. Clear reuse state
      # and perform the normal review rather than recording false coverage.
      DUPLICATE_OF=""
    fi
  fi
fi

TIMEOUT_SECONDS="${AGENT_REVIEW_TIMEOUT_SECONDS:-1200}"
case "$TIMEOUT_SECONDS" in
  ''|*[!0-9]*) TIMEOUT_SECONDS=1200 ;;
esac
if [ "$TIMEOUT_SECONDS" -lt 1 ]; then TIMEOUT_SECONDS=1200; fi

MAX_OUTPUT_BYTES="${AGENT_REVIEW_MAX_OUTPUT_BYTES:-1000000}"
case "$MAX_OUTPUT_BYTES" in
  ''|*[!0-9]*) MAX_OUTPUT_BYTES=1000000 ;;
esac

TIMEOUT_MARKER="${REVIEW_DIR}/${COMMIT}.timeout"
rm -f "$OUTPUT_PATH" "$STDERR_PATH" "$TEMP_OUTPUT" "$TIMEOUT_MARKER"

# A signal or clone failure leaves explicit evidence instead of no status.
write_status "failed" "$IMPLEMENTER" "$REVIEWER" "interrupted"

# Review from a detached, depth-two local fetch containing tracked files only.
# Ignored/untracked files (including local .env files and other dirty chunks)
# and unrelated historical objects never enter the reviewer working directory.
SNAPSHOT_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/agent-review.XXXXXX")"
if ! git -C "$SNAPSHOT_ROOT" init --quiet ||
   ! git -C "$SNAPSHOT_ROOT" fetch --quiet --depth 2 "file://$(pwd)" "$COMMIT" ||
   ! git -C "$SNAPSHOT_ROOT" checkout --quiet --detach FETCH_HEAD ||
   ! git -C "$SNAPSHOT_ROOT" hash-object -t tree -w /dev/null >/dev/null; then
  write_status "failed" "$IMPLEMENTER" "$REVIEWER" "snapshot_error"
  printf 'agent-review: FAILED %s — could not create isolated tracked-file snapshot; commit is NOT REVIEWED\n' "$COMMIT" >&2
  exit 2
fi

set +e
perl -MPOSIX -e 'POSIX::setsid(); exec {$ARGV[0]} @ARGV or die "exec failed: $!"' \
  scripts/agent-review.sh \
  --implementer "$IMPLEMENTER" \
  --range "$REVIEW_RANGE" \
  --review-root "$SNAPSHOT_ROOT" \
  >"$TEMP_OUTPUT" 2>"$STDERR_PATH" &
REVIEW_PID=$!
# Watchdog: enforce the wall-clock timeout, and kill a runaway reviewer within
# 500ms of its streamed stdout/stderr artifacts crossing the output byte cap
# instead of letting it fill the disk until it exits on its own. An oversize
# kill leaves no timeout marker; the post-wait size check classifies it as
# output_too_large.
node -e '
  const fs = require("node:fs")
  const pid = Number(process.argv[1])
  const marker = process.argv[2]
  const timeoutMs = Number(process.argv[3]) * 1000
  const capBytes = Number(process.argv[4])
  const watchedFiles = process.argv.slice(5)
  const groupAlive = () => {
    try { process.kill(-pid, 0); return true } catch { return false }
  }
  const killGroup = () => {
    try { process.kill(-pid, "SIGTERM") } catch {}
    setTimeout(() => {
      try { process.kill(-pid, "SIGKILL") } catch {}
      process.exit(0)
    }, 2000)
  }
  const fileSize = (file) => {
    try { return fs.statSync(file).size } catch { return 0 }
  }
  const sizePoll = setInterval(() => {
    if (!groupAlive()) process.exit(0)
    if (watchedFiles.some((file) => fileSize(file) > capBytes)) {
      clearInterval(sizePoll)
      killGroup()
    }
  }, 500)
  setTimeout(() => {
    clearInterval(sizePoll)
    if (!groupAlive()) process.exit(0)
    fs.writeFileSync(marker, "")
    killGroup()
  }, timeoutMs)
' "$REVIEW_PID" "$TIMEOUT_MARKER" "$TIMEOUT_SECONDS" "$MAX_OUTPUT_BYTES" "$TEMP_OUTPUT" "$STDERR_PATH" &
WATCHDOG_PID=$!

wait "$REVIEW_PID"
REVIEW_EXIT=$?
if [ -f "$TIMEOUT_MARKER" ]; then
  # Let the watchdog finish its TERM -> KILL escalation for every descendant.
  wait "$WATCHDOG_PID" 2>/dev/null || true
else
  kill "$WATCHDOG_PID" 2>/dev/null || true
  wait "$WATCHDOG_PID" 2>/dev/null || true
fi
# The session leader exiting does not prove the group is gone: a TERM-trapping
# descendant of a size-capped reviewer can outlive the leader (the size-poll
# kill path cancels the watchdog's pending SIGKILL above) and keep regrowing
# the artifact through its inherited fd. Always finish with a group SIGKILL.
kill -KILL -- "-$REVIEW_PID" 2>/dev/null || true
WATCHDOG_PID=""
REVIEW_PID=""
if [ -f "$TIMEOUT_MARKER" ]; then
  REVIEW_EXIT=124
  printf 'review exceeded %ss timeout\n' "$TIMEOUT_SECONDS" >>"$STDERR_PATH"
fi
set -e

# The captured stdout stream is the single canonical artifact source; the
# wrapper's --out/tee path stays reserved for manual human invocations.
mv "$TEMP_OUTPUT" "$OUTPUT_PATH"

OUTPUT_BYTES="$(wc -c <"$OUTPUT_PATH" | tr -d ' ')"
STDERR_BYTES="$(wc -c <"$STDERR_PATH" | tr -d ' ')"
if [ "$OUTPUT_BYTES" -gt "$MAX_OUTPUT_BYTES" ] || [ "$STDERR_BYTES" -gt "$MAX_OUTPUT_BYTES" ]; then
  # Truncate with a bounded read: never load a runaway artifact whole.
  REVIEW_CAP="$MAX_OUTPUT_BYTES" node -e '
    const fs = require("node:fs")
    for (const file of process.argv.slice(1)) {
      const cap = Number(process.env.REVIEW_CAP)
      let size = 0
      try { size = fs.statSync(file).size } catch { continue }
      if (size <= cap) continue
      const fd = fs.openSync(file, "r")
      const head = Buffer.alloc(cap)
      const bytesRead = fs.readSync(fd, head, 0, cap, 0)
      fs.closeSync(fd)
      fs.writeFileSync(file, Buffer.concat([
        head.subarray(0, bytesRead),
        Buffer.from("\n[review artifact truncated]\n"),
      ]))
    }
  ' "$OUTPUT_PATH" "$STDERR_PATH"
  write_status "failed" "$IMPLEMENTER" "$REVIEWER" "output_too_large"
  printf 'agent-review: FAILED %s — reviewer output exceeded %s bytes; commit is NOT REVIEWED\n' \
    "$COMMIT" "$MAX_OUTPUT_BYTES" >&2
  exit 2
fi

if [ -s "$STDERR_PATH" ]; then cat "$STDERR_PATH" >&2; fi
if [ -s "$OUTPUT_PATH" ]; then cat "$OUTPUT_PATH"; fi

if [ "$REVIEW_EXIT" -ne 0 ]; then
  if [ "$REVIEW_EXIT" -eq 124 ]; then
    FAILURE_CLASS="timeout"
  else
    FAILURE_CLASS="$(classify_failure)"
  fi
  write_status "failed" "$IMPLEMENTER" "$REVIEWER" "$FAILURE_CLASS"
  printf 'agent-review: FAILED %s — %s reviewer unavailable (%s); commit is NOT REVIEWED\n' \
    "$COMMIT" "$REVIEWER" "$FAILURE_CLASS" >&2
  exit "$REVIEW_EXIT"
fi

if [ "$(cat "$OUTPUT_PATH")" = "NO FINDINGS" ]; then
  write_status "passed" "$IMPLEMENTER" "$REVIEWER"
  printf 'agent-review: PASSED %s (%s reviewed %s)\n' "$COMMIT" "$REVIEWER" "$IMPLEMENTER" >&2
  exit 0
fi

if [ ! -s "$OUTPUT_PATH" ]; then
  write_status "failed" "$IMPLEMENTER" "$REVIEWER" "reviewer_error"
  printf 'agent-review: FAILED %s — empty reviewer output; commit is NOT REVIEWED\n' "$COMMIT" >&2
  exit 2
fi

write_status "findings" "$IMPLEMENTER" "$REVIEWER"
printf 'agent-review: FINDINGS %s — verify and remediate before push\n' "$COMMIT" >&2
exit 0
