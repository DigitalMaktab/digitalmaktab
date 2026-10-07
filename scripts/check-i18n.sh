#!/usr/bin/env bash
# check-i18n.sh — flag translation keys that the SPA uses but no
# locale bundle defines, and vice versa. Catches typos like
# fCousinName vs fCousineName before they ship as raw dotted paths
# in the UI.
#
# Scans every .tsx under digitalmaktab-spa/src and
# digitalmaktab-spa-country-afghanistan/src for `t("…")` / `t('…')`
# calls, then compares against the keys defined in the Core en-US
# bundle plus every locale from the Afghan country package.
#
# Usage: ./scripts/check-i18n.sh [--strict]
#   default: prints the diff and exits 0 (CI-friendly summary)
#   --strict: exits 1 if any used-but-undefined keys exist
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"
STRICT=0
if [ "${1:-}" = "--strict" ]; then STRICT=1; fi

python3 - "$PROJECTS" "$STRICT" <<'PY'
import json, os, re, sys, pathlib
projects = sys.argv[1]
strict = sys.argv[2] == "1"

core_en = pathlib.Path(projects) / "digitalmaktab-spa-core/src/locales/en-US/translation.json"
afghan_locales = pathlib.Path(projects) / "digitalmaktab-spa-country-afghanistan/src/locales"

def flatten(d, prefix=""):
    out = set()
    for k, v in d.items():
        key = f"{prefix}{k}"
        if isinstance(v, dict):
            out.update(flatten(v, key + "."))
        else:
            out.add(key)
    return out

available = set()
with open(core_en) as f:
    available |= flatten(json.load(f))
for lang_dir in sorted(afghan_locales.iterdir()):
    bundle = lang_dir / "translation.json"
    if bundle.exists():
        with open(bundle) as f:
            available |= flatten(json.load(f))

# Scan .tsx + .ts for t("key") / t('key'). Skip translations where
# the key is interpolated (template literal / variable) — those are
# dynamic and the checker can't resolve them statically.
scan_dirs = [
    pathlib.Path(projects) / "digitalmaktab-spa/src",
    pathlib.Path(projects) / "digitalmaktab-spa-country-afghanistan/src",
]
pat = re.compile(r"""\bt\(\s*["']([a-zA-Z][a-zA-Z0-9_.]*)["']""")
used = {}
for root in scan_dirs:
    for p in root.rglob("*"):
        if p.suffix not in (".tsx", ".ts"):
            continue
        try:
            txt = p.read_text()
        except Exception:
            continue
        for m in pat.finditer(txt):
            used.setdefault(m.group(1), []).append(str(p.relative_to(projects)))

missing = sorted(k for k in used if k not in available and "." in k)
unused = sorted(k for k in available if k not in used and "." in k)

print(f"i18n coverage check")
print(f"  defined keys:  {len(available)}")
print(f"  used keys:     {len(used)}")
print(f"  missing:       {len(missing)}  (used but not defined)")
print(f"  unused:        {len(unused)}  (defined but not used)")

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
