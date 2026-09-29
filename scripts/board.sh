#!/usr/bin/env bash
# Shows who is working on what. Run: bash scripts/board.sh
set -uo pipefail
git fetch -q origin --prune
now=$(date +%s)
printf '%-8s %-22s %-12s %-6s %s\n' TASK STATE LAST-ACTIVITY AHEAD AGENT
for ref in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin/agent/ | sort); do
  id="${ref#origin/agent/}"
  ahead=$(git rev-list --count "origin/main..$ref")
  last=$(git log -1 --format=%ct "$ref"); age=$(( (now - last) / 3600 ))
  st=$(git show "$ref:docs/reports/$id.md" 2>/dev/null | grep -m1 -iE '^\*\*Status:\*\*' | sed -E 's/\*\*Status:\*\* *//; s/ *·.*//' || true)
  who=$(git show "$ref:docs/reports/$id.md" 2>/dev/null | grep -m1 -iE '^\*\*Agent:\*\*' | sed -E 's/\*\*Agent:\*\* *//' || true)
  if [ "$ahead" = "0" ]; then
    mst=$(git show "origin/main:docs/reports/$id.md" 2>/dev/null | grep -m1 -iE '^\*\*Status:\*\*' | sed -E 's/\*\*Status:\*\* *//; s/ *·.*//' || true)
    state="MERGED (${mst:-no report})"
  elif [ -z "$st" ]; then
    state="WORKING (no check-in)"
  else
    state="$st"
  fi
  printf '%-8s %-22s %-12s %-6s %s\n' "$id" "$state" "${age}h ago" "$ahead" "${who:--}"
done
