#!/usr/bin/env bash
# health-check.sh — run every per-repo build + typecheck in one shot
# and report a traffic-light summary at the end. Catches "my repo
# builds in isolation but something cross-cutting broke" before a
# multi-repo PR goes out.
#
# Each pre-commit hook only guards its own repo; this script is the
# "all green?" cross-check you run before pushing a branch that
# spans multiple repos.
#
# Usage: ./scripts/health-check.sh
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"

PASS=()
FAIL=()

run_check() {
  local name="$1" cmd="$2"
  printf "%-55s" "$name"
  local out
  if out=$(eval "$cmd" 2>&1); then
    echo "ok"
    PASS+=("$name")
  else
    echo "FAIL"
    echo "----- $name output (last 20 lines) -----"
    echo "$out" | tail -20
    echo "-----"
    FAIL+=("$name")
  fi
}

echo "digitalmaktab health check — $(date '+%F %T')"
echo

run_check "core          · dotnet build -c Release" \
  "cd '$PROJECTS/digitalmaktab-core' && dotnet build -c Release"

run_check "country-af    · dotnet build -c Release" \
  "cd '$PROJECTS/digitalmaktab-country-afghanistan' && dotnet build -c Release"

run_check "api           · dotnet build" \
  "cd '$PROJECTS/digitalmaktab-api' && dotnet build"

run_check "spa-sdk       · tsc --noEmit" \
  "cd '$PROJECTS/digitalmaktab-spa-sdk' && npx tsc --noEmit"

run_check "spa-core      · tsc --noEmit" \
  "cd '$PROJECTS/digitalmaktab-spa-core' && npx tsc --noEmit"

run_check "spa-country-af · tsc --noEmit" \
  "cd '$PROJECTS/digitalmaktab-spa-country-afghanistan' && npx tsc --noEmit"

run_check "spa (shell)    · tsc --noEmit" \
  "cd '$PROJECTS/digitalmaktab-spa' && npx tsc --noEmit"

run_check "i18n coverage  · check-i18n.sh --strict" \
  "'$ROOT/scripts/check-i18n.sh' --strict"

run_check "i18n parity    · check-i18n-parity.sh --strict" \
  "'$ROOT/scripts/check-i18n-parity.sh' --strict"

run_check "resx orphans   · check-resx.sh (no unused keys)" \
  "'$ROOT/scripts/check-resx.sh' | grep -qE 'unreferenced keys:\s+0'"

# Hooks must be symlinked in every sibling repo — otherwise a dev who
# forgot to run install-hooks.sh after cloning gets no pre-commit
# protection. Verify both pre-commit AND post-merge point at the
# shared scripts.
run_check "secret-scan     · check-secrets.sh executable" \
  "test -x '$ROOT/scripts/check-secrets.sh'"

run_check "hooks installed · pre-commit + post-merge symlinks" \
  "for dir in $PROJECTS/digitalmaktab $PROJECTS/digitalmaktab-*; do
     [ -d \"\$dir/.git\" ] || continue;
     test -L \"\$dir/.git/hooks/pre-commit\" || exit 1;
     test -L \"\$dir/.git/hooks/post-merge\" || exit 1;
   done"

echo
echo "===== summary ====="
echo "  passed: ${#PASS[@]}"
echo "  failed: ${#FAIL[@]}"
if [ ${#FAIL[@]} -gt 0 ]; then
  echo
  echo "FAILED:"
  for n in "${FAIL[@]}"; do echo "  × $n"; done
  exit 1
fi
echo "all green ✓"
