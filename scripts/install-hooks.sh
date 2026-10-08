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

# Auto-discover sibling repos instead of hard-coding — a new country
# package (digitalmaktab-spa-country-<name>) or microservice landing
# in the projects/ root gets picked up on the next bootstrap without
# anyone remembering to edit this list.
#
# Rules:
#   - sibling of this repo (same parent dir as digitalmaktab/)
#   - name is either exactly 'digitalmaktab' OR starts with
#     'digitalmaktab-' (keeps unrelated git repos in the parent out)
#   - has a .git directory (a plain source dir isn't a repo)
REPOS=()
while IFS= read -r -d '' dir; do
  name="$(basename "$dir")"
  if [ "$name" = "digitalmaktab" ] || [[ "$name" == digitalmaktab-* ]]; then
    [ -d "$dir/.git" ] && REPOS+=("$name")
  fi
done < <(find "$PROJECTS" -mindepth 1 -maxdepth 1 -type d -print0 | sort -z)

if [ ${#REPOS[@]} -eq 0 ]; then
  echo "no sibling digitalmaktab* repos found under $PROJECTS" >&2
  exit 1
fi

for repo in "${REPOS[@]}"; do
  hooks_dir="$PROJECTS/$repo/.git/hooks"
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
