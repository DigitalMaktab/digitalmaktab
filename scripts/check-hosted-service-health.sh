#!/usr/bin/env bash
# check-hosted-service-health.sh — enforce that every BackgroundService
# in Core opts into the IHostedServiceHealthTracker. Services that
# don't call RecordRun silently fall off GET /api/root/service-health;
# the dashboard still passes 'all green' with no mention of them,
# which is exactly the kind of silent-death the heartbeat was shipped
# to prevent.
#
# For each *BackgroundService.cs file under Core/src, check:
#   - IHostedServiceHealthTracker appears in the primary constructor
#     (ctor-injected field) OR as a private field
#   - the file calls RecordRun( at least once in its body
#
# A file that defines a BackgroundService but satisfies neither is
# reported as drift. Exit 1 in strict mode so pre-commit blocks it.
#
# Usage: ./scripts/check-hosted-service-health.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"
SERVICES_DIR="$PROJECTS/digitalmaktab-core/src/DigitalMaktab.Core/Services"

python3 - "$SERVICES_DIR" <<'PY'
import re, sys, pathlib

services_dir = pathlib.Path(sys.argv[1])
if not services_dir.exists():
    print(f"ERROR: {services_dir} not found", file=sys.stderr); sys.exit(1)

bg_class_pat = re.compile(r'\bclass\s+(\w+)\s*(?:\([^)]*\))?\s*(?::|,|\s)[^{]*BackgroundService\b')
tracker_decl = re.compile(r'IHostedServiceHealthTracker\b')
record_call = re.compile(r'\bhealth\.RecordRun\(|\bRecordRun\(')

bg_files = []
for p in sorted(services_dir.rglob("*BackgroundService.cs")):
    if "/obj/" in str(p) or "/bin/" in str(p): continue
    bg_files.append(p)

issues = []
for p in bg_files:
    text = p.read_text()
    if not bg_class_pat.search(text):
        # File named *BackgroundService.cs but not actually declaring
        # one — probably a helper. Skip rather than flag.
        continue
    has_tracker = bool(tracker_decl.search(text))
    has_recordrun = bool(record_call.search(text))
    if not (has_tracker and has_recordrun):
        issues.append((p, has_tracker, has_recordrun))

print("hosted-service health opt-in check")
print(f"  BackgroundService files: {len(bg_files)}")
print(f"  not opted into tracker:  {len(issues)}")

if not issues:
    print("  ok — every BackgroundService injects IHostedServiceHealthTracker and calls RecordRun")
    sys.exit(0)

print()
print("DRIFT DETECTED")
for p, has_tracker, has_recordrun in issues:
    rel = p.relative_to(services_dir.parent.parent.parent)
    print(f"  × {rel}")
    if not has_tracker:
        print("      - IHostedServiceHealthTracker not injected")
    if not has_recordrun:
        print("      - no RecordRun( call in the file body")
print()
print("Fix: inject IHostedServiceHealthTracker in the primary ctor and")
print("bracket RunOnceAsync with health.RecordRun(name, success, err) calls")
print("so the service shows up on GET /api/root/service-health.")
sys.exit(1)
PY
