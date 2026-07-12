#!/usr/bin/env bash
# agent-review.sh — cross-model code review with one incantation.
#
# Routes the review to the model that did NOT implement the work:
#   implementer claude  -> reviewer: codex exec, gpt-5.6-terra, reasoning effort medium
#   implementer codex   -> reviewer: claude -p,  Opus 4.8, high thinking
#
# Usage:
#   scripts/agent-review.sh [--implementer claude|codex] [--range A..B]
#                           [--personas p1,p2] [--out FILE] [--dry-run]
#
# Defaults: implementer auto-detected (CLAUDECODE=1 -> claude, else codex);
# range = working tree vs HEAD when dirty, otherwise HEAD~1..HEAD.
# The reviewer runs READ-ONLY and follows docs/operating-system/review-personas.md.
# Costs reviewer-CLI tokens; never invoked automatically by git hooks.
set -euo pipefail
cd "$(dirname "$0")/.."

IMPLEMENTER=""
RANGE=""
PERSONAS="all"
OUT=""
DRY_RUN=0

while [ $# -gt 0 ]; do
  case "$1" in
    --implementer) IMPLEMENTER="$2"; shift 2 ;;
    --range)       RANGE="$2"; shift 2 ;;
    --personas)    PERSONAS="$2"; shift 2 ;;
    --out)         OUT="$2"; shift 2 ;;
    --dry-run)     DRY_RUN=1; shift ;;
    -h|--help)     sed -n '2,15p' "$0"; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

if [ -z "$IMPLEMENTER" ]; then
  if [ "${CLAUDECODE:-}" = "1" ]; then IMPLEMENTER="claude"; else IMPLEMENTER="codex"; fi
fi
case "$IMPLEMENTER" in claude|codex) ;; *) echo "--implementer must be claude or codex" >&2; exit 2 ;; esac

if [ -z "$RANGE" ]; then
  # git status --porcelain also catches untracked files, which git diff HEAD
  # misses; a brand-new untracked route must not bypass review.
  if [ -n "$(git status --porcelain)" ]; then
    RANGE="WORKING_TREE"
  else
    RANGE="HEAD~1..HEAD"
  fi
fi

if [ "$RANGE" = "WORKING_TREE" ]; then
  SCOPE="the uncommitted working-tree changes (git diff HEAD, plus untracked files via git status)"
else
  SCOPE="the commit range ${RANGE} (git log --stat ${RANGE}; git diff ${RANGE})"
fi

PROMPT="You are performing a cross-model code review in this repository. You did not write this code; be adversarial.

Scope: review ${SCOPE}.

Method:
1. Read docs/operating-system/review-personas.md and adopt these personas: ${PERSONAS}.
2. Inspect the diff and enough surrounding source to judge correctness in context; do not review the diff in isolation.
3. Check that docs owned by each persona (docs/systems/*.md) still match the changed behavior; doc drift is a finding.
4. Output ONLY findings using the reviewer output contract from that doc:
   <BLOCKER|MAJOR|MINOR> <persona> <file:line> — <problem>. <concrete failure scenario>. Fix: <suggestion>.
   One line per finding, ordered by severity. If nothing is found after a genuine search, output exactly: NO FINDINGS.
No praise, no summary of what the change does, no style nits ESLint already enforces."

if [ "$IMPLEMENTER" = "claude" ]; then
  # gpt-5.6-terra is the GPT 5.6 variant available on this ChatGPT-account
  # Codex install; plain "gpt-5.6" is rejected with invalid_request_error.
  REVIEWER_DESC="codex exec (gpt-5.6-terra, reasoning effort medium, read-only sandbox)"
  CMD=(codex exec --sandbox read-only --model gpt-5.6-terra -c model_reasoning_effort=medium "$PROMPT")
  ENV_PREFIX=()
else
  REVIEWER_DESC="claude -p (claude-opus-4-8, high thinking, read-only tools)"
  CMD=(claude -p "$PROMPT" --model claude-opus-4-8
       --allowedTools "Read,Grep,Glob,Bash(git diff:*),Bash(git log:*),Bash(git show:*),Bash(git status:*)")
  ENV_PREFIX=(env MAX_THINKING_TOKENS=32000)
fi

echo "agent-review: implementer=${IMPLEMENTER} reviewer=${REVIEWER_DESC}" >&2
echo "agent-review: scope=${SCOPE}" >&2

if [ "$DRY_RUN" = "1" ]; then
  printf 'DRY RUN — would execute:\n'
  if [ "${#ENV_PREFIX[@]}" -gt 0 ]; then printf '%s ' "${ENV_PREFIX[@]}"; fi
  printf '%q ' "${CMD[@]}"
  printf '\n'
  exit 0
fi

if [ -n "$OUT" ]; then
  "${ENV_PREFIX[@]+"${ENV_PREFIX[@]}"}" "${CMD[@]}" | tee "$OUT"
else
  "${ENV_PREFIX[@]+"${ENV_PREFIX[@]}"}" "${CMD[@]}"
fi
