#!/usr/bin/env bash
# install-hooks.sh — symlink pre-commit-hook.sh into every sibling
# repo's .git/hooks/pre-commit. Run once after a fresh clone; after
# that any edit to pre-commit-hook.sh takes effect everywhere.
#
# Usage: ./scripts/install-hooks.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"
HOOK_SRC="$ROOT/scripts/pre-commit-hook.sh"

if [ ! -x "$HOOK_SRC" ]; then
  echo "ERROR: $HOOK_SRC not executable" >&2
  exit 1
fi

REPOS=(
  digitalmaktab
  digitalmaktab-core
  digitalmaktab-api
  digitalmaktab-country-afghanistan
  digitalmaktab-spa-core
  digitalmaktab-spa-sdk
  digitalmaktab-spa-country-afghanistan
  digitalmaktab-spa
)

for repo in "${REPOS[@]}"; do
  hooks_dir="$PROJECTS/$repo/.git/hooks"
  if [ ! -d "$hooks_dir" ]; then
    echo "skip $repo (not a git repo at $hooks_dir)"
    continue
  fi
  target="$hooks_dir/pre-commit"
  ln -sf "$HOOK_SRC" "$target"
  echo "linked $repo"
done

echo "done — each repo's pre-commit hook now dispatches via $HOOK_SRC"
echo "skip for an emergency commit with: git commit --no-verify"
