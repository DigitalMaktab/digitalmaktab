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

run_secret_scan() {
  if [ -x "$MONOREPO/scripts/check-secrets.sh" ]; then
    "$MONOREPO/scripts/check-secrets.sh"
  fi
}

run_enum_sync() {
  # Broader generalisation of the old notification-type-only check:
  # walks every TS enum in spa-core and diffs it against its C#
  # counterpart.
  if [ -x "$MONOREPO/scripts/check-enum-sync.sh" ]; then
    "$MONOREPO/scripts/check-enum-sync.sh"
  fi
}

run_pkg_version_sync() {
  # Enforce @digitalmaktab/* dep version strings in every consumer
  # package.json match the owning package's own version.
  if [ -x "$MONOREPO/scripts/check-pkg-versions.sh" ]; then
    "$MONOREPO/scripts/check-pkg-versions.sh"
  fi
}

run_i18n_check() {
  if [ -x "$MONOREPO/scripts/check-i18n.sh" ]; then
    echo "pre-commit: check-i18n.sh --strict"
    "$MONOREPO/scripts/check-i18n.sh" --strict
  fi
}

run_mobile_i18n_check() {
  if [ -x "$MONOREPO/scripts/check-mobile-i18n.sh" ]; then
    echo "pre-commit: check-mobile-i18n.sh --strict"
    "$MONOREPO/scripts/check-mobile-i18n.sh" --strict
  fi
}

# Parity check runs in any repo that owns a translation surface —
# a change to en-US alone or an Afghan locale alone silently
# violates the golden "translate everything" rule and this blocks it.
run_i18n_parity_check() {
  if [ -x "$MONOREPO/scripts/check-i18n-parity.sh" ]; then
    echo "pre-commit: check-i18n-parity.sh --strict"
    "$MONOREPO/scripts/check-i18n-parity.sh" --strict
  fi
}

# Secret scan runs in EVERY repo — a stray credential is the one
# commit-time check that must never be skipped by dispatch logic.
run_secret_scan

# @digitalmaktab/* version-drift check runs in EVERY repo too —
# any package.json edit touching a scoped dep (upstream or
# downstream of the edit) can land the drift, so there's no
# clean dispatch split; just run it everywhere.
run_pkg_version_sync

case "$REPO_NAME" in
  digitalmaktab-spa-core)
    run_tsc
    run_i18n_parity_check
    run_enum_sync
    ;;
  digitalmaktab-spa-country-afghanistan)
    run_tsc
    run_i18n_parity_check
    ;;
  digitalmaktab-spa-sdk)
    run_tsc
    ;;
  digitalmaktab-spa)
    run_tsc
    run_i18n_check
    ;;
  digitalmaktab-core)
    run_dotnet_build Release
    run_i18n_parity_check
    run_enum_sync
    ;;
  digitalmaktab-country-afghanistan)
    run_dotnet_build Release
    run_i18n_parity_check
    ;;
  digitalmaktab-api)
    run_dotnet_build Debug
    ;;
  digitalmaktab-mobile-parent|digitalmaktab-mobile-student|digitalmaktab-mobile-country-afghanistan|digitalmaktab-mobile-sdk)
    run_mobile_i18n_check
    ;;
  digitalmaktab)
    # Monorepo stub holds docs + scripts — parity runs here too so
    # a tweak to the script surfaces any resulting drift immediately.
    run_i18n_parity_check
    ;;
  *)
    echo "pre-commit: unknown repo $REPO_NAME, skipping checks"
    ;;
esac

echo "pre-commit: ok"
