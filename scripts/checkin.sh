#!/usr/bin/env bash
# Check-in ("hajira") for one task. Run this FIRST, before reading or changing anything else.
# Usage: bash scripts/checkin.sh <TASK-ID> "<agent name>"
# Exit codes: 0 checked in (fresh or resume) | 10 task already done | 11 another agent is active | 12 cannot continue
set -euo pipefail

ID="${1:-}"
[ -n "$ID" ] || { echo "usage: bash scripts/checkin.sh <TASK-ID> \"<agent name>\""; exit 2; }
WHO="${2:-${AGENT_NAME:-unnamed-agent}}"
BR="agent/$ID"
REPORT="docs/reports/$ID.md"
STALE_HOURS="${STALE_HOURS:-6}"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

git config user.email >/dev/null 2>&1 || git config user.email "agent@local"
git config user.name  >/dev/null 2>&1 || git config user.name  "agent"

[ -z "$(git status --porcelain)" ] || { echo "STOP: working tree is not clean. Commit or stash your changes, then run again."; exit 12; }
git fetch -q origin --prune

# 1) already finished and merged?
if git show "origin/main:$REPORT" >/dev/null 2>&1; then
  st="$(git show "origin/main:$REPORT" | grep -m1 -iE '^\*\*Status:\*\*' || true)"
  if echo "$st" | grep -qi 'done'; then
    echo "STOP: $ID is already done and merged into main ($st)."
    exit 10
  fi
fi

write_stub() {
  mkdir -p docs/reports
  cat > "$REPORT" <<EOF
# Report — $ID

**Status:** In progress
**Started:** $NOW
**Agent:** $WHO

## Check-in log
- $NOW — checked in by $WHO
EOF
}

# 2) has someone already started?
if git ls-remote --exit-code --heads origin "$BR" >/dev/null 2>&1; then
  git fetch -q origin "$BR"
  last="$(git log -1 --format=%ct "origin/$BR")"
  age_h=$(( ( $(date +%s) - last ) / 3600 ))
  st="$(git show "origin/$BR:$REPORT" 2>/dev/null | grep -m1 -iE '^\*\*Status:\*\*' || true)"
  who="$(git show "origin/$BR:$REPORT" 2>/dev/null | grep -m1 -iE '^\*\*Agent:\*\*' || true)"
  echo "Branch $BR exists. ${st:-No report on it.} ${who} Last activity ${age_h}h ago."
  if [ "$age_h" -lt "$STALE_HOURS" ] && { [ -z "$st" ] || echo "$st" | grep -qi 'in progress'; }; then
    echo "STOP: another agent is active on $ID (last activity ${age_h}h ago). Do not touch this task."
    exit 11
  fi
  echo "RESUME: continuing $ID on the existing branch (previous attempt was blocked, partial or stale)."
  git switch -q -C "$BR" "origin/$BR"
  if ! git merge -q --no-edit origin/main; then
    git merge --abort 2>/dev/null || true
    echo "STOP: cannot merge main into $BR cleanly. Treat as BLOCKED and report."
    exit 12
  fi
  if [ -f "$REPORT" ]; then
    tmp="$(mktemp)"
    awk -v who="$WHO" 'BEGIN{d=0;a=0} /^\*\*Status:\*\*/ && !d {print "**Status:** In progress"; d=1; next} /^\*\*Agent:\*\*/ && !a {print "**Agent:** " who; a=1; next} {print}' "$REPORT" > "$tmp" && mv "$tmp" "$REPORT"
    grep -q '^## Check-in log' "$REPORT" || printf '\n## Check-in log\n' >> "$REPORT"
    printf -- '- %s — resumed by %s\n' "$NOW" "$WHO" >> "$REPORT"
  else
    write_stub
  fi
  MSG="$ID: check-in (resume) by $WHO"
else
  git switch -q main
  git pull -q --ff-only origin main
  git switch -q -c "$BR"
  write_stub
  MSG="$ID: check-in by $WHO"
fi

git add "$REPORT"
git commit -q -m "$MSG"
if ! git push -q -u origin "$BR"; then
  echo "STOP: push rejected. Either another agent checked in at the same moment, or you have no push permission. Treat as BLOCKED."
  exit 11
fi
echo "CHECKED IN: $ID on branch $BR at $NOW (agent: $WHO)"
