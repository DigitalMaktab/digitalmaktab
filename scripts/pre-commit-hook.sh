#!/usr/bin/env bash
# pre-commit-hook.sh — the body of each sibling repo's
# .git/hooks/pre-commit. install-hooks.sh symlinks this file into
# each repo so updates land everywhere at once.
#
# Dispatches on repo name:
#   spa / spa-core / spa-country-afghanistan / spa-sdk  → tsc --noEmit
#   spa  → + check-i18n --strict
#   core / country-afghanistan / api → dotnet build (Release for core,
#     Debug for the api host)
#
# Blocks the commit on any failure. Skip with `git commit --no-verify`
# for emergencies.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
REPO_NAME="$(basename "$REPO_ROOT")"
MONOREPO="$(cd "$REPO_ROOT/../digitalmaktab" && pwd)"

run_tsc() {
  if ! command -v npx >/dev/null; then
    echo "pre-commit: npx not found, skipping tsc"
    return 0
  fi
  echo "pre-commit: tsc --noEmit in $REPO_NAME"
  (cd "$REPO_ROOT" && npx tsc --noEmit)
}

run_dotnet_build() {
  local config="${1:-Debug}"
  echo "pre-commit: dotnet build -c $config in $REPO_NAME"
  (cd "$REPO_ROOT" && dotnet build -c "$config" >/dev/null)
}

run_i18n_check() {
  if [ -x "$MONOREPO/scripts/check-i18n.sh" ]; then
    echo "pre-commit: check-i18n.sh --strict"
    "$MONOREPO/scripts/check-i18n.sh" --strict
  fi
}

case "$REPO_NAME" in
  digitalmaktab-spa-core|digitalmaktab-spa-sdk|digitalmaktab-spa-country-afghanistan)
    run_tsc
    ;;
  digitalmaktab-spa)
    run_tsc
    run_i18n_check
    ;;
  digitalmaktab-core|digitalmaktab-country-afghanistan)
    run_dotnet_build Release
    ;;
  digitalmaktab-api)
    run_dotnet_build Debug
    ;;
  digitalmaktab)
    # Monorepo stub holds docs + scripts — nothing to build.
    ;;
  *)
    echo "pre-commit: unknown repo $REPO_NAME, skipping checks"
    ;;
esac

echo "pre-commit: ok"
