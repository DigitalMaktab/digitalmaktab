#!/usr/bin/env bash
# check-notification-type-sync.sh — enforce that the TS mirror of
# the C# NotificationType enum stays in sync. The two files MUST
# agree on member name + ordinal because:
#
#   - the TS enum ordinal is what gets sent on the wire for
#     NotificationPreferences
#   - the C# enum stores an int in the DB (append-only ordinals)
#
# A drift silently breaks the preferences opt-out: a user toggles
# off BIRTHDAY, backend reads an unknown ordinal, defaults to SYSTEM
# → wrong filter.
#
# Scans:
#   digitalmaktab-core/src/DigitalMaktab.Core.Abstractions/Models/NotificationType.cs
#   digitalmaktab-spa-core/src/models/NotificationType.ts
#
# Exits 1 on any mismatch so pre-commit blocks the drift.
#
# Usage: ./scripts/check-notification-type-sync.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"

CS_FILE="$PROJECTS/digitalmaktab-core/src/DigitalMaktab.Core.Abstractions/Models/NotificationType.cs"
TS_FILE="$PROJECTS/digitalmaktab-spa-core/src/models/NotificationType.ts"

python3 - "$CS_FILE" "$TS_FILE" <<'PY'
import re, sys, pathlib

cs_path = pathlib.Path(sys.argv[1])
ts_path = pathlib.Path(sys.argv[2])

if not cs_path.exists():
    print(f"ERROR: {cs_path} not found", file=sys.stderr)
    sys.exit(1)
if not ts_path.exists():
    print(f"ERROR: {ts_path} not found", file=sys.stderr)
    sys.exit(1)

def parse_enum(text, line_pat):
    # Returns [(name, ordinal), …] in file order, auto-filling the
    # ordinal when the source omits it (C# auto-numbers if omitted;
    # TS keeps the last explicit value + 1).
    members = []
    next_ord = 0
    for line in text.splitlines():
        m = line_pat.match(line.strip())
        if not m:
            continue
        name = m.group(1)
        raw_ord = m.group(2)
        if raw_ord is not None and raw_ord.strip():
            ordinal = int(raw_ord)
        else:
            ordinal = next_ord
        members.append((name, ordinal))
        next_ord = ordinal + 1
    return members

# C# enum member: NAME, or NAME = N,
cs_pat = re.compile(r'^([A-Z][A-Z0-9_]+)\s*(?:=\s*(\d+)\s*)?[,\s]*$')
# TS enum member: NAME = N, (trailing comma optional)
ts_pat = re.compile(r'^([A-Z][A-Z0-9_]+)\s*=\s*(\d+)\s*,?\s*$')

cs_members = parse_enum(cs_path.read_text(), cs_pat)
ts_members = parse_enum(ts_path.read_text(), ts_pat)

cs_map = dict(cs_members)
ts_map = dict(ts_members)

errors = []

# Membership diff
only_cs = sorted(set(cs_map) - set(ts_map))
only_ts = sorted(set(ts_map) - set(cs_map))
if only_cs:
    errors.append(("only in C#", only_cs))
if only_ts:
    errors.append(("only in TS", only_ts))

# Ordinal diff for shared names
ordinal_mismatch = []
for name in sorted(set(cs_map) & set(ts_map)):
    if cs_map[name] != ts_map[name]:
        ordinal_mismatch.append((name, cs_map[name], ts_map[name]))
if ordinal_mismatch:
    errors.append(("ordinal mismatch", ordinal_mismatch))

print(f"notification-type sync check")
print(f"  C# members: {len(cs_map)}")
print(f"  TS members: {len(ts_map)}")

if not errors:
    print("  ok — both enums agree on names + ordinals")
    sys.exit(0)

print()
print("DRIFT DETECTED")
for label, items in errors:
    print(f"  {label}:")
    if label == "ordinal mismatch":
        for name, cs_o, ts_o in items:
            print(f"    - {name}: C#={cs_o}  TS={ts_o}")
    else:
        for name in items:
            print(f"    - {name}")
print()
print("Fix: edit the lagging file to match the other. The C# enum is")
print("the source of truth for DB ordinals; add new members at the end.")
sys.exit(1)
PY
