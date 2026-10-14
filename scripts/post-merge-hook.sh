#!/usr/bin/env bash
# post-merge-hook.sh — auto-sync downstream repos after a `git pull`
# brings in changes to a package consumed via tarball install.
#
# Problem it solves: a developer `git pull`s digitalmaktab-core and
# then starts the API — but the API still uses the previous Core
# nupkg in ~/.nuget/packages because sync-dotnet.sh wasn't run.
# This hook detects "did the merge actually touch files that other
# repos consume?" and if so, invokes the right sync script so the
# tarball install picks up the new build on next restart.
#
# Dispatches on the repo name of the repo being pulled:
#   digitalmaktab-core / digitalmaktab-country-afghanistan
#     → ./scripts/sync-dotnet.sh (API consumes these as nupkgs)
#   digitalmaktab-spa-core / digitalmaktab-spa-country-afghanistan
#     → ./scripts/sync-spa.sh (SPA consumes these as npm tarballs)
#   anything else → no-op
#
# install-hooks.sh symlinks this into every sibling repo's
# .git/hooks/post-merge so a single `git pull` keeps consumers in
# sync without manual intervention.
#
# Skip for a quick pull without the sync overhead with:
#   SKIP_AUTO_SYNC=1 git pull
set -euo pipefail

if [ "${SKIP_AUTO_SYNC:-0}" = "1" ]; then
  echo "post-merge: SKIP_AUTO_SYNC=1 — skipping auto-sync"
  exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
REPO_NAME="$(basename "$REPO_ROOT")"
MONOREPO="$(cd "$REPO_ROOT/../digitalmaktab" 2>/dev/null && pwd || true)"

if [ -z "$MONOREPO" ]; then
  echo "post-merge: sibling digitalmaktab/ not found, skipping auto-sync"
  exit 0
fi

# Nothing meaningful changed? Skip. ORIG_HEAD is set by git merge to
# the pre-merge tip; comparing against HEAD gives the merged-in diff.
# A fast-forward pull with no commits is a no-op; detect by equality.
if [ "$(git rev-parse ORIG_HEAD 2>/dev/null || echo "")" = "$(git rev-parse HEAD)" ]; then
  echo "post-merge: no commits merged, skipping auto-sync"
  exit 0
fi

CHANGED_FILES="$(git diff --name-only ORIG_HEAD HEAD 2>/dev/null || echo "")"
if [ -z "$CHANGED_FILES" ]; then
  echo "post-merge: no file diff detected, skipping auto-sync"
  exit 0
fi

run_sync_dotnet() {
  if [ -x "$MONOREPO/scripts/sync-dotnet.sh" ]; then
    echo "post-merge: triggering sync-dotnet.sh (Core/Afghan pack+swap)"
    "$MONOREPO/scripts/sync-dotnet.sh"
  else
    echo "post-merge: sync-dotnet.sh not executable, skipping"
  fi
}

run_sync_spa() {
  if [ -x "$MONOREPO/scripts/sync-spa.sh" ]; then
    echo "post-merge: triggering sync-spa.sh (spa-core/Afghan pack+swap)"
    "$MONOREPO/scripts/sync-spa.sh"
  else
    echo "post-merge: sync-spa.sh not executable, skipping"
  fi
}

case "$REPO_NAME" in
  digitalmaktab-core|digitalmaktab-country-*|digitalmaktab-school-*)
    # Only sync if source actually changed — pure doc / markdown
    # merges shouldn't trigger a 30s pack cycle.
    if echo "$CHANGED_FILES" | grep -qE '\.(cs|resx|csproj|json)$'; then
      run_sync_dotnet
    else
      echo "post-merge: no .cs/.resx/.csproj changes, skipping sync-dotnet"
    fi
    ;;
  digitalmaktab-spa-core|digitalmaktab-spa-sdk|digitalmaktab-spa-country-*|digitalmaktab-spa-school-*)
    if echo "$CHANGED_FILES" | grep -qE '\.(ts|tsx|json|css|scss)$'; then
      run_sync_spa
    else
      echo "post-merge: no ts/tsx/json/css changes, skipping sync-spa"
    fi
    ;;
  *)
    # digitalmaktab-api, -spa, and the monorepo stub
    # don't produce artifacts other repos consume — nothing to sync.
    echo "post-merge: $REPO_NAME has no downstream consumers, skipping"
    ;;
esac

echo "post-merge: done"
