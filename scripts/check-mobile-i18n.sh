#!/usr/bin/env bash
# check-mobile-i18n.sh — mobile-tree sibling of check-i18n.sh:
# scans every .ts/.tsx under the RN apps + mobile-sdk + mobile
# country packages for literal `t("key")` calls, then diffs
# against the keys the mobile country packages define. A key
# referenced but not defined would render as the raw dotted
# string in the app — same silent-fallthrough bug the SPA
# scanner catches.
#
# Available keys = union of every digitalmaktab-mobile-country-*
# locale bundle (en-US + fa-AF + ps-AF all ship side-by-side).
#
# Usage: ./scripts/check-mobile-i18n.sh [--strict]
#   default: prints the diff and exits 0 (CI-friendly summary)
#   --strict: exits 1 if any used-but-undefined keys exist
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"
STRICT=0
if [ "${1:-}" = "--strict" ]; then STRICT=1; fi

python3 - "$PROJECTS" "$STRICT" <<'PY'
import json, os, re, sys, pathlib
projects = pathlib.Path(sys.argv[1])
strict = sys.argv[2] == "1"

# Available keys: load every locale bundle from every mobile country
# package and union them. The mobile tree ships en-US + fa-AF + ps-AF
# in one package so the available set is the superset per package.
def flatten(d, prefix=""):
    out = set()
    for k, v in d.items():
        key = f"{prefix}{k}"
        if isinstance(v, dict): out |= flatten(v, key + ".")
        else: out.add(key)
    return out

bundles_scanned = 0
available = set()
for mdir in sorted(projects.glob("digitalmaktab-mobile-country-*")):
    locales_dir = mdir / "src/locales"
    if not locales_dir.exists(): continue
    for sub in ("en-US", "fa-AF", "ps-AF"):
        bundle = locales_dir / sub / "translation.json"
        if bundle.exists():
            try:
                available |= flatten(json.loads(bundle.read_text()))
                bundles_scanned += 1
            except Exception as e:
                print(f"  WARN  failed to parse {bundle}: {e}", file=sys.stderr)

# Scan every mobile source tree for literal t("...") calls. Covers
# the RN apps (mobile-parent, mobile-student), the sdk (likely no
# t() calls but cheap to include), and the country package itself
# (country-package internal UI pieces).
scan_roots = []
for d in sorted(projects.iterdir()):
    if not d.is_dir(): continue
    if not d.name.startswith("digitalmaktab-mobile-"): continue
    src = d / "src"
    if src.exists(): scan_roots.append(src)

pat = re.compile(r"""\bt\(\s*["']([a-zA-Z][a-zA-Z0-9_.]*)["']""")
used = {}
for root in scan_roots:
    for p in root.rglob("*"):
        if p.suffix not in (".tsx", ".ts"): continue
        if "/node_modules/" in str(p) or "/dist/" in str(p): continue
        try: txt = p.read_text()
        except Exception: continue
        for m in pat.finditer(txt):
            used.setdefault(m.group(1), []).append(str(p.relative_to(projects)))

missing = sorted(k for k in used if k not in available and "." in k)

print("mobile i18n coverage check")
print(f"  bundles scanned:  {bundles_scanned}")
print(f"  defined keys:     {len(available)}")
print(f"  used keys:        {len(used)}")
print(f"  source trees:     {len(scan_roots)}")
print(f"  missing:          {len(missing)}  (used but not defined)")

if missing:
    print()
    print("Missing (first 40):")
    for k in missing[:40]:
        callsites = used[k][:2]
        print(f"  {k}")
        for c in callsites:
            print(f"      {c}")
    if len(missing) > 40:
        print(f"  … and {len(missing) - 40} more")

if strict and missing:
    sys.exit(1)
PY
