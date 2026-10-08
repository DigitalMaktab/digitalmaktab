#!/usr/bin/env bash
# install-hooks.sh — symlink the shared hook scripts into every
# sibling repo's .git/hooks/. Run once after a fresh clone; after
# that any edit to the *-hook.sh scripts takes effect everywhere.
#
# Hooks installed:
#   pre-commit   → pre-commit-hook.sh (tsc / dotnet build / i18n)
#   post-merge   → post-merge-hook.sh (auto-sync on `git pull` of
#                  a tarball-published package)
#
# Usage: ./scripts/install-hooks.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"

HOOKS=(
  "pre-commit:$ROOT/scripts/pre-commit-hook.sh"
  "post-merge:$ROOT/scripts/post-merge-hook.sh"
)

for spec in "${HOOKS[@]}"; do
  hook_name="${spec%%:*}"
  hook_src="${spec#*:}"
  if [ ! -x "$hook_src" ]; then
    echo "ERROR: $hook_src not executable" >&2
    exit 1
  fi
done

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
  for spec in "${HOOKS[@]}"; do
    hook_name="${spec%%:*}"
    hook_src="${spec#*:}"
    ln -sf "$hook_src" "$hooks_dir/$hook_name"
  done
  echo "linked $repo (pre-commit + post-merge)"
done

echo "done — hooks dispatch via $ROOT/scripts/*-hook.sh"
echo "  skip a pre-commit with: git commit --no-verify"
echo "  skip post-merge auto-sync with: SKIP_AUTO_SYNC=1 git pull"
