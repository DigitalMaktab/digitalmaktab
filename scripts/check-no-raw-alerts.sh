#!/usr/bin/env bash
# check-no-raw-alerts.sh — guard against raw `<div class="alert alert-*">`
# regressions in the SPA.
#
# Rule: every inline alert banner routes through `AppAlert` from
# @digitalmaktab/spa-core. The shared component owns dark-theme
# token mapping, RTL spacing, `role="alert"`, and the fade +
# dismissible chrome. A hand-rolled `<div className="alert alert-X">`
# in a screen bypasses all of that — the user has already fixed this
# three dozen times across five sweep batches; this guard stops the
# anti-pattern from drifting back in.
#
# Scan: every .tsx under digitalmaktab-spa/src. Flag any line with
# a className that contains `alert alert-<variant>` where the variant
# matches an AppAlertVariant. The AppAlert source itself is allowed —
# that's where the class string actually lives.
#
# Usage: ./scripts/check-no-raw-alerts.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"
SPA_SRC="$PROJECTS/digitalmaktab-spa/src"

python3 - "$SPA_SRC" <<'PY'
import re, sys, pathlib
spa = pathlib.Path(sys.argv[1])
if not spa.exists():
    print(f"ERROR: {spa} not found", file=sys.stderr); sys.exit(1)

# Any className attr containing `alert alert-<variant>`. Covers
# `className="alert alert-danger"` AND `className={`alert alert-${v}`}`.
# Allowed only inside the AppAlert source itself — but AppAlert lives
# in spa-core, not in the SPA, so no exclusion needed here. If it ever
# moves, add the explicit path check.
pat = re.compile(r'className=[{"\'`][^"\'`}]*\balert\s+alert-')

issues = []
scanned = 0
for tsx in sorted(spa.rglob("*.tsx")):
    scanned += 1
    text = tsx.read_text()
    for lineno, line in enumerate(text.splitlines(), start=1):
        if pat.search(line):
            issues.append((tsx, lineno, line.strip()))

print("raw-alert guard")
print(f"  files scanned: {scanned}")
print(f"  violations:    {len(issues)}")

if not issues:
    print("  ok — every inline alert routes through AppAlert")
    sys.exit(0)

print()
print("RAW ALERT — use AppAlert from @digitalmaktab/spa-core instead:")
for tsx, lineno, snippet in issues:
    rel = tsx.relative_to(spa.parent)
    print(f"  × {rel}:{lineno}")
    print(f"      {snippet[:120]}")
print()
print("Fix: import AppAlert and swap")
print('  <div className="alert alert-danger">…</div>')
print("for")
print('  <AppAlert variant="danger">…</AppAlert>')
sys.exit(1)
PY
