#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "Error: not a git repository"
  exit 1
}
cd "$ROOT"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$BRANCH" == "HEAD" ]]; then
  echo "Error: detached HEAD — checkout a branch first"
  exit 1
fi

REMOTE="${SYNC_REMOTE:-origin}"

if [[ -n "$(git status --porcelain)" ]]; then
  if [[ "${SYNC_SKIP_COMMIT:-}" == "1" ]]; then
    echo "Error: working tree has uncommitted changes. Commit or stash before syncing."
    git status -sb
    exit 1
  fi

  MSG="${SYNC_MSG:-sync: auto-commit $(date -u +%Y-%m-%dT%H:%M:%SZ)}"
  echo "→ Staging local changes..."
  git add -A
  echo "→ Committing: $MSG"
  git commit -m "$MSG"
fi

echo "→ Fetching from $REMOTE..."
git fetch "$REMOTE"

echo "→ Pulling $REMOTE/$BRANCH (rebase)..."
git pull --rebase "$REMOTE" "$BRANCH"

echo "→ Pushing to $REMOTE/$BRANCH..."
git push "$REMOTE" "$BRANCH"

echo "✓ Synced with $REMOTE/$BRANCH"
