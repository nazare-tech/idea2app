#!/usr/bin/env bash
# Drives the brand-variety image batch: one Codex run per idea, three at a time.
#
# Each run reads its own brief.md and writes six images into that idea's images/.
# Ideas whose six images already exist are skipped, so the script is safe to re-run
# after a partial failure or an interrupted batch.
#
# Concurrency is capped at 3 because each run makes six image-generation calls and a
# wider fan-out mostly buys rate-limit errors.
#
# Usage: scripts/run-brand-variety-batch.sh [batch-root] [max-parallel]

set -uo pipefail

ROOT="${1:-output/mockup-brand-variety}"
MAX_PARALLEL="${2:-3}"
LOG_DIR="$ROOT/logs"

# A non-numeric max-parallel would silently disable the throttle below and fan out
# every idea's paid image calls at once.
if ! [[ "$MAX_PARALLEL" =~ ^[1-9][0-9]*$ ]]; then
  echo "max-parallel must be a positive integer, got: $MAX_PARALLEL" >&2
  exit 2
fi

mkdir -p "$LOG_DIR"

EXPECTED_FILES=(
  native-mobile-app-option-a.png native-mobile-app-option-b.png native-mobile-app-option-c.png
  desktop-web-option-a.png desktop-web-option-b.png desktop-web-option-c.png
)

# Lists the expected filenames that are missing or empty for an idea, one per line.
missing_outputs() {
  local dir="$1"
  local name
  for name in "${EXPECTED_FILES[@]}"; do
    [ -s "$dir/images/$name" ] || echo "$name"
  done
}

run_idea() {
  local dir="$1"
  local slug
  slug="$(basename "$dir")"
  local missing
  missing="$(missing_outputs "$dir")"

  if [ -z "$missing" ]; then
    echo "skip   $slug (all six expected images present and non-empty)"
    return 0
  fi

  # Regenerate only what is actually missing, so an interrupted idea does not
  # re-spend paid generations on the five images that already completed.
  local missing_list
  missing_list="$(echo "$missing" | tr '\n' ' ')"

  echo "start  $slug (missing: $missing_list)"
  if ! codex exec \
    --sandbox workspace-write \
    --skip-git-repo-check \
    --cd "$dir" \
    -c model_reasoning_effort=medium \
    "Read brief.md and design-plan.md in this directory. Generate ONLY these missing images, exactly as brief.md specifies: $missing_list. Do not regenerate or overwrite any image file that already exists. Follow the 'How to generate' section literally: call image_gen.imagegen for every image, pass the correct platform skeleton as the only referenced image, then copy each generated file out of ~/.codex/generated_images/ to its output path and verify with ls -la. Do not use ImageMagick or any shell drawing command." \
    > "$LOG_DIR/$slug.log" 2>&1; then
    echo "FAIL   $slug (codex exec non-zero, see $LOG_DIR/$slug.log)"
    return 1
  fi

  local remaining
  remaining="$(missing_outputs "$dir")"
  if [ -n "$remaining" ]; then
    echo "FAIL   $slug (still missing: $(echo "$remaining" | tr '\n' ' '))"
    return 1
  fi
  echo "done   $slug (6/6 expected images)"
}

pids=()
for dir in "$ROOT"/*/; do
  [ -f "$dir/brief.md" ] || continue

  run_idea "$dir" &
  pids+=($!)

  while [ "$(jobs -rp | wc -l | tr -d ' ')" -ge "$MAX_PARALLEL" ]; do
    sleep 5
  done
done

failures=0
for pid in "${pids[@]}"; do
  wait "$pid" || failures=$((failures + 1))
done

echo
echo "=== batch summary ==="
total=0
for dir in "$ROOT"/*/; do
  [ -f "$dir/brief.md" ] || continue
  count="$(ls "$dir/images"/*.png 2>/dev/null | wc -l | tr -d ' ')"
  total=$((total + count))
  printf '%-16s %s/6\n' "$(basename "$dir")" "$count"
done
echo "total images: $total"
if [ "$failures" -gt 0 ]; then
  echo "FAILED ideas: $failures (see $LOG_DIR)"
  exit 1
fi
