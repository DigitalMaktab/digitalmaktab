#!/usr/bin/env bash
# check-abstractions-isolation.sh — guard the layering of
# DigitalMaktab.Core.Abstractions vs DigitalMaktab.Core.
#
# Rule: Core.Abstractions holds the data model + interface contracts.
# It MUST NOT reference anything from the Core project (where the EF
# interceptors, services, controllers, DI wiring live). The csproj
# dependency is one-way (Core → Core.Abstractions, never the other
# way), so a stray `using DigitalMaktab.Core.Services.Foo;` in an
# Abstractions file would compile only via the implicit reverse-
# reference the project SDK forbids — but a Visual Studio quick-fix
# can silently add such a 'using' line while leaving the csproj
# untouched. By the time someone notices they can't build the
# nupkg, the import is 10 commits deep.
#
# Scan: every .cs file under Core.Abstractions. Flag any line
# matching 'using DigitalMaktab.Core.' that isn't followed by
# 'Abstractions' or 'Models'.
#
# Usage: ./scripts/check-abstractions-isolation.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"
ABSTR_DIR="$PROJECTS/digitalmaktab-core/src/DigitalMaktab.Core.Abstractions"

python3 - "$ABSTR_DIR" <<'PY'
import re, sys, pathlib
abstr = pathlib.Path(sys.argv[1])
if not abstr.exists():
    print(f"ERROR: {abstr} not found", file=sys.stderr); sys.exit(1)

# Match `using DigitalMaktab.Core.<something>;` where <something>
# does NOT start with 'Abstractions' or 'Models'. The Models
# namespace is defined IN Core.Abstractions (DigitalMaktab.Core.
# Models) so legitimate imports of it look like a Core import to
# the naive regex — allow them explicitly.
#
# Note: namespace of entity classes in Core.Abstractions is actually
# `DigitalMaktab.Core.Models` — see any of the .cs files in
# Abstractions/Models/. So lines like 'using DigitalMaktab.Core.
# Models;' from WITHIN the Abstractions project are fine (they're
# the project's own namespace).
pat = re.compile(r'^\s*using\s+(DigitalMaktab\.Core\.[A-Z][A-Za-z0-9_.]*)\s*;')

issues = []
for cs in sorted(abstr.rglob("*.cs")):
    if "/obj/" in str(cs) or "/bin/" in str(cs): continue
    text = cs.read_text()
    for lineno, line in enumerate(text.splitlines(), start=1):
        m = pat.match(line)
        if not m: continue
        imported = m.group(1)
        tail = imported[len("DigitalMaktab.Core."):]
        if tail.startswith("Abstractions") or tail.startswith("Models") or tail == "Models":
            continue
        issues.append((cs, lineno, imported))

print("abstractions isolation check")
print(f"  files scanned: {sum(1 for _ in abstr.rglob('*.cs'))}")
print(f"  bad imports:   {len(issues)}")

if not issues:
    print("  ok — Core.Abstractions imports nothing from Core proper")
    sys.exit(0)

print()
print("LAYER VIOLATION — Core.Abstractions references Core:")
for cs, lineno, imported in issues:
    rel = cs.relative_to(abstr.parent)
    print(f"  × {rel}:{lineno}")
    print(f"      using {imported};")
print()
print("Fix: move the needed type into Core.Abstractions, or move the")
print("referencing code OUT of Abstractions into Core proper.")
sys.exit(1)
PY
