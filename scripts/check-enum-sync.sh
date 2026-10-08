#!/usr/bin/env bash
# check-enum-sync.sh — generalisation of the NotificationType drift
# guard: for every TS enum under digitalmaktab-spa-core/src/models,
# look for a C# enum with the same filename stem under
# digitalmaktab-core/src/DigitalMaktab.Core.Abstractions/Models,
# and verify both sides agree on member names + ordinals.
#
# Replaces check-notification-type-sync.sh (which only covered one
# pair). Blocks on:
#   - member only in C#      → TS mirror forgot to extend
#   - member only in TS      → TS added a value backend doesn't know
#   - ordinal mismatch       → names agree but wire-format drifted
#
# A missing C# counterpart is NOT an error (some TS enums are
# frontend-only — e.g. EmptyEnum, LearningMaterialType shapes that
# don't exist on the backend). The report line shows the skip count
# so operators notice if an unexpectedly large chunk is 'frontend
# only'.
#
# Usage: ./scripts/check-enum-sync.sh [--verbose]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"
VERBOSE=0
if [ "${1:-}" = "--verbose" ]; then VERBOSE=1; fi

python3 - "$PROJECTS" "$VERBOSE" <<'PY'
import re, sys, pathlib

projects = pathlib.Path(sys.argv[1])
verbose = sys.argv[2] == "1"

ts_dir = projects / "digitalmaktab-spa-core/src/models"
cs_dir = projects / "digitalmaktab-core/src/DigitalMaktab.Core.Abstractions/Models"

if not ts_dir.exists():
    print(f"ERROR: {ts_dir} not found", file=sys.stderr); sys.exit(1)
if not cs_dir.exists():
    print(f"ERROR: {cs_dir} not found", file=sys.stderr); sys.exit(1)

# Line patterns. Members are ALL_CAPS_WITH_UNDERSCORES or
# PascalCase; both forms show up in the codebase. Ordinal is
# optional — many C# AND TS enums let it auto-increment. The TS
# pattern allows string values too (= "") so a mixed string/int
# enum doesn't drop its name entries; the diff below skips the
# ordinal comparison when either side carries non-numeric values.
cs_pat = re.compile(r'^([A-Z][A-Za-z0-9_]+)\s*(?:=\s*(\d+)\s*)?[,\s]*$')
ts_pat = re.compile(r'^([A-Z][A-Za-z0-9_]+)\s*(?:=\s*(\d+|"[^"]*"|\'[^\']*\'))?\s*,?\s*$')

def parse_enum(text, line_pat):
    # Walk lines inside an `enum …` block. The `{` can be on the same
    # line as the enum name (TS convention) OR on the next line (C#
    # convention — common in this codebase). Track brace depth from
    # the first `{` we see after the enum keyword.
    members = []
    next_ord = 0
    in_block = False
    depth = 0
    expecting_open = False
    for raw in text.splitlines():
        stripped = raw.strip()
        if not in_block and not expecting_open:
            if re.search(r'\benum\s+[A-Z]', stripped):
                if "{" in stripped:
                    in_block = True
                    depth = stripped.count("{") - stripped.count("}")
                else:
                    expecting_open = True
            continue
        if expecting_open:
            if "{" in stripped:
                in_block = True
                expecting_open = False
                depth = stripped.count("{") - stripped.count("}")
            continue
        # in_block
        depth += stripped.count("{") - stripped.count("}")
        if depth <= 0:
            in_block = False
            continue
        m = line_pat.match(stripped)
        if not m: continue
        name = m.group(1)
        raw_ord = m.group(2)
        ordinal = None  # None = non-numeric (string value) or
                        # mixed-enum member we don't want to compare
        if raw_ord is None or not raw_ord.strip():
            ordinal = next_ord
        elif raw_ord.strip().lstrip("-").isdigit():
            ordinal = int(raw_ord)
        # else: raw_ord is a quoted string → leave ordinal=None
        members.append((name, ordinal))
        if ordinal is not None:
            next_ord = ordinal + 1
    return members

total_checked = 0
skipped_no_cs = 0
drift_count = 0
drift_rows = []

for ts_file in sorted(ts_dir.glob("*.ts")):
    stem = ts_file.stem
    cs_file = cs_dir / f"{stem}.cs"
    if not cs_file.exists():
        skipped_no_cs += 1
        if verbose: print(f"  skip {stem}: no C# counterpart")
        continue
    ts_text = ts_file.read_text()
    if "export enum" not in ts_text:
        if verbose: print(f"  skip {stem}: TS is not an enum")
        continue
    cs_text = cs_file.read_text()
    if "enum" not in cs_text:
        if verbose: print(f"  skip {stem}: C# is not an enum")
        continue

    ts_members = parse_enum(ts_text, ts_pat)
    cs_members = parse_enum(cs_text, cs_pat)
    if not ts_members or not cs_members:
        if verbose: print(f"  skip {stem}: couldn't parse members (ts={len(ts_members)} cs={len(cs_members)})")
        continue

    total_checked += 1
    cs_map = dict(cs_members)
    ts_map = dict(ts_members)

    only_cs = sorted(set(cs_map) - set(ts_map))
    # Members that live only on the TS side AND carry a string value
    # (ordinal=None in our parser) are form-select placeholders — a
    # convention for nullable selects (EMPTY = ""). Those don't
    # represent real enum drift; skip them from the report.
    only_ts = sorted(n for n in set(ts_map) - set(cs_map)
                     if ts_map[n] is not None)
    # Only compare ordinals when BOTH sides have a numeric value for
    # the member — a string-valued member on either side skips the
    # ordinal check for that key (name-sync is still enforced).
    ord_mismatch = []
    for n in sorted(set(cs_map) & set(ts_map)):
        c_ord, t_ord = cs_map[n], ts_map[n]
        if c_ord is None or t_ord is None: continue
        if c_ord != t_ord:
            ord_mismatch.append((n, c_ord, t_ord))

    if only_cs or only_ts or ord_mismatch:
        drift_count += 1
        drift_rows.append((stem, only_cs, only_ts, ord_mismatch))

print(f"enum sync check")
print(f"  TS enums scanned:   {total_checked}")
print(f"  no C# counterpart:  {skipped_no_cs}")
print(f"  drifted:            {drift_count}")

if not drift_rows:
    print("  ok — every mirrored enum agrees on names + ordinals")
    sys.exit(0)

print()
print("DRIFT DETECTED")
for stem, only_cs, only_ts, ord_mismatch in drift_rows:
    print(f"  {stem}:")
    for n in only_cs: print(f"    - only in C#: {n}")
    for n in only_ts: print(f"    - only in TS: {n}")
    for n, c, t in ord_mismatch: print(f"    - ordinal: {n} C#={c} TS={t}")
print()
print("Fix: edit the lagging file(s). C# enums are the DB-side source")
print("of truth; new members go at the END of the C# enum, then mirror.")
sys.exit(1)
PY
