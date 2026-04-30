#!/usr/bin/env bash
# sync-upstream.sh — rebase aloysiusmartis/signal onto jay-sahnan/signal main
set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

echo "Fetching upstream (jay-sahnan/signal)..."
git fetch upstream

UPSTREAM_HEAD=$(git rev-parse upstream/main)
LOCAL_HEAD=$(git rev-parse main)

echo "upstream/main : $UPSTREAM_HEAD"
echo "local main    : $LOCAL_HEAD"

if [[ "$UPSTREAM_HEAD" == "$LOCAL_HEAD" ]]; then
  echo "Already at upstream tip — checking for fork commits on top..."
fi

FORK_COMMITS=$(git log --oneline upstream/main..main)
if [[ -n "$FORK_COMMITS" ]]; then
  echo ""
  echo "Fork commits that will be rebased on top:"
  echo "$FORK_COMMITS"
fi

if $DRY_RUN; then
  echo ""
  echo "[dry-run] Would run: git rebase upstream/main && git push origin main --force-with-lease"
  exit 0
fi

echo ""
echo "Rebasing main onto upstream/main..."
git rebase upstream/main

echo ""
echo "Verifying @COORDINATION.md is line 2 of CLAUDE.md..."
LINE2=$(sed -n '2p' CLAUDE.md)
if [[ "$LINE2" != "@COORDINATION.md" ]]; then
  echo "WARNING: @COORDINATION.md missing from CLAUDE.md line 2 — re-adding..."
  sed -i '' '1a\\
@COORDINATION.md' CLAUDE.md
  git add CLAUDE.md
  git commit -m "chore: restore @COORDINATION.md in CLAUDE.md post-rebase"
else
  echo "OK — @COORDINATION.md present."
fi

echo ""
echo "Pushing to origin..."
git push origin main --force-with-lease

echo ""
echo "Done. main is now synced to upstream/main."
