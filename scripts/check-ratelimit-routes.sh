#!/usr/bin/env bash
# check-ratelimit-routes.sh — cross-check appsettings.json's
# IpRateLimiting.GeneralRules endpoints against live controller
# routes. Silent misconfigured endpoints (a typo in a rule's path)
# fall through to the general '*' bucket, so a per-endpoint
# tightening does nothing until someone discovers it under attack.
#
# The script is strict only on EXPLICIT endpoint rules (not the
# generic '*' catch-alls, which always match by definition). An
# endpoint rule that doesn't resolve to any controller route is
# reported + the script exits 1 so pre-commit blocks the commit.
#
# Usage: ./scripts/check-ratelimit-routes.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"
APPSETTINGS="$PROJECTS/digitalmaktab-api/appsettings.json"
CORE_CONTROLLERS="$PROJECTS/digitalmaktab-core/src/DigitalMaktab.Core/Controllers"

python3 - "$APPSETTINGS" "$CORE_CONTROLLERS" <<'PY'
import json, re, sys, pathlib
from collections import defaultdict

appsettings = pathlib.Path(sys.argv[1])
controllers_dir = pathlib.Path(sys.argv[2])

if not appsettings.exists():
    print(f"ERROR: {appsettings} not found", file=sys.stderr); sys.exit(1)
if not controllers_dir.exists():
    print(f"ERROR: {controllers_dir} not found", file=sys.stderr); sys.exit(1)

data = json.loads(appsettings.read_text())
rules = (data.get("IpRateLimiting") or {}).get("GeneralRules") or []
explicit = []
for r in rules:
    ep = r.get("Endpoint", "")
    if ep == "*" or ep.endswith(":*"):
        continue  # catch-all, by definition matches
    explicit.append(ep)

# Build the set of live controller routes. Each controller declares
# [Route("api/...")] at the class level, then [HttpVerb("subpath")] on
# each action. The ip-rate-limit rule format is 'verb:/api/path'.
route_pat = re.compile(r'\[Route\(\s*"([^"]+)"\s*\)\]')
http_pat = re.compile(r'\[(Http(Get|Post|Put|Delete|Patch))(?:\(\s*"([^"]*)"\s*\))?\]')

live_routes = set()
for cs in sorted(controllers_dir.rglob("*.cs")):
    text = cs.read_text()
    route_m = route_pat.search(text)
    if not route_m: continue
    base = route_m.group(1).strip("/")
    # Normalise [controller] token to the class name minus 'Controller'
    class_m = re.search(r'class\s+([A-Z][A-Za-z0-9_]+)Controller', text)
    if class_m and "[controller]" in base.lower():
        base = re.sub(r'\[controller\]', class_m.group(1).lower(), base, flags=re.IGNORECASE)
    for m in http_pat.finditer(text):
        verb = m.group(2).lower()
        sub = (m.group(3) or "").strip("/")
        full = f"{base}" if not sub else f"{base}/{sub}"
        full = "/" + full
        live_routes.add(f"{verb}:{full}")

missing = []
for ep in explicit:
    # Strip trailing * if any (shouldn't be here but defensive).
    if ep.endswith("/*"):
        prefix = ep[:-2]
        # Prefix match against live routes.
        if not any(lr.startswith(prefix) for lr in live_routes):
            missing.append(ep)
    else:
        if ep not in live_routes:
            missing.append(ep)

print("rate-limit route check")
print(f"  explicit rules:  {len(explicit)}")
print(f"  live routes:     {len(live_routes)}")
print(f"  unmatched rules: {len(missing)}")

if not missing:
    print("  ok — every explicit IpRateLimiting rule maps to a live route")
    sys.exit(0)

print()
print("UNMATCHED RATE-LIMIT RULES")
for ep in missing:
    print(f"  × {ep}")
    # Suggest nearest match by Jaccard on path segments.
    parts = ep.split(":", 1)
    if len(parts) == 2:
        verb, path = parts
        best = None
        best_score = 0
        want = set(path.strip("/").split("/"))
        for lr in live_routes:
            if not lr.startswith(verb + ":"): continue
            have = set(lr.split(":", 1)[1].strip("/").split("/"))
            score = len(want & have) / max(1, len(want | have))
            if score > best_score:
                best_score = score; best = lr
        if best and best_score >= 0.5:
            print(f"      did you mean: {best}  (jaccard {best_score:.2f})")
print()
print("Fix: edit appsettings.json so each rule's Endpoint matches a real route,")
print("or drop the rule if the endpoint was removed.")
sys.exit(1)
PY
