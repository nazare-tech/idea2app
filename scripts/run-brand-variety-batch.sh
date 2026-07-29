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

mkdir -p "$LOG_DIR"

run_idea() {
  local dir="$1"
  local slug
  slug="$(basename "$dir")"
  local saved
  saved="$(ls "$dir/images"/*.png 2>/dev/null | wc -l | tr -d ' ')"

  if [ "$saved" = "6" ]; then
    echo "skip   $slug (already has 6 images)"
    return 0
  fi

  echo "start  $slug"
  codex exec \
    --sandbox workspace-write \
    --skip-git-repo-check \
    --cd "$dir" \
    -c model_reasoning_effort=medium \
    "Read brief.md and design-plan.md in this directory, then produce all six images exactly as brief.md specifies. Follow the 'How to generate' section literally: call image_gen.imagegen for every image, pass the correct platform skeleton as the only referenced image, then copy each generated file out of ~/.codex/generated_images/ to its output path and verify with ls -la. Overwrite any existing output file without asking. Do not use ImageMagick or any shell drawing command." \
    > "$LOG_DIR/$slug.log" 2>&1

  local final
  final="$(ls "$dir/images"/*.png 2>/dev/null | wc -l | tr -d ' ')"
  echo "done   $slug ($final/6 images)"
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

for pid in "${pids[@]}"; do
  wait "$pid"
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
