#!/usr/bin/env bash
# run-all.sh — the one quality gate: every backend test suite plus the static checks, in order.
# Exits non-zero if anything fails and prints a summary, so it can block a merge in CI or be run
# before a release. Each suite owns its private, throwaway PostgreSQL cluster (never the dev DB).
#
# Usage: ./scripts/tests/run-all.sh            # everything
#        SKIP_SLOW=1 ./scripts/tests/run-all.sh  # skip the actual-process API load harness
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"
LOGS="$(mktemp -d "${TMPDIR:-/tmp}/digitalmaktab-run-all.XXXXXX")"
declare -a NAMES=() RESULTS=()

step() {
    local name="$1"; shift
    local log="$LOGS/$(echo "$name" | tr ' /' '__').log"
    printf '==> %-40s ' "$name"
    local started=$SECONDS
    if "$@" >"$log" 2>&1; then
        printf 'ok   (%ss)\n' $((SECONDS - started)); RESULTS+=("ok")
    else
        printf 'FAIL (%ss)  log: %s\n' $((SECONDS - started)) "$log"; RESULTS+=("FAIL")
        grep -E "\[FAIL\]|Failed!|error CS|Error Message" -A2 "$log" | head -12 | sed 's/^/      /'
    fi
    NAMES+=("$name")
}

# Static checks first: they are fast and catch whole classes of drift.
step "i18n parity (all locales)"        bash "$ROOT/scripts/check-i18n-parity.sh" --strict
step "resx sanity"                      bash "$ROOT/scripts/check-resx.sh"
step "hosted-service health opt-in"     bash "$ROOT/scripts/check-hosted-service-health.sh"
step "abstractions isolation"           bash "$ROOT/scripts/check-abstractions-isolation.sh"
step "secrets scan"                     bash "$ROOT/scripts/check-secrets.sh"
step "vulnerable NuGet packages"        bash -c "cd '$PROJECTS/digitalmaktab-core' && ! dotnet list src/DigitalMaktab.Core package --vulnerable --include-transitive 2>&1 | grep -q '^ *>'"
# Backend formatting follows each repo's .editorconfig; run `dotnet format whitespace <project>` to fix.
for project in digitalmaktab-core/src/DigitalMaktab.Core/DigitalMaktab.Core.csproj \
               digitalmaktab-core/src/DigitalMaktab.Core.Abstractions/DigitalMaktab.Core.Abstractions.csproj \
               digitalmaktab-core/tests/DigitalMaktab.Core.Tests/DigitalMaktab.Core.Tests.csproj \
               digitalmaktab-api/DigitalMaktab.Api.csproj \
               digitalmaktab-country-afghanistan/DigitalMaktab.Country.Afghanistan.csproj \
               digitalmaktab-country-austria/DigitalMaktab.Country.Austria.csproj; do
    step "format: $(basename "$project" .csproj)" dotnet format whitespace "$PROJECTS/$project" --verify-no-changes
done

# Builds and type checks.
step "Core build (Release)"             dotnet build "$PROJECTS/digitalmaktab-core/src/DigitalMaktab.Core" -c Release -nologo
step "spa-core type check"              bash -c "cd '$PROJECTS/digitalmaktab-spa-core' && npx tsc --noEmit -p ."
step "SPA shell type check"             bash -c "cd '$PROJECTS/digitalmaktab-spa' && npx tsc --noEmit -p ."

# Test suites against private PostgreSQL clusters.
step "Core tests (all)"                 bash "$ROOT/scripts/tests/run-core-support-postgres.sh"
step "Afghanistan tests"                bash "$ROOT/scripts/tests/run-afghan-academic-postgres.sh"
step "Austria tests"                    bash "$ROOT/scripts/tests/run-austria-postgres.sh"
if [ -z "${SKIP_SLOW:-}" ]; then
    step "API actual-process harness"   bash "$ROOT/scripts/tests/run-full-api-load.sh"
fi

failed=0
echo; echo "Summary (logs in $LOGS):"
for i in "${!NAMES[@]}"; do
    printf '  %-4s %s\n' "${RESULTS[$i]}" "${NAMES[$i]}"
    [ "${RESULTS[$i]}" = "FAIL" ] && failed=$((failed + 1))
done
if [ "$failed" -gt 0 ]; then echo "$failed step(s) failed."; exit 1; fi
echo "All steps passed."
