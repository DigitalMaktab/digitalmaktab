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
# Usage: ./scripts/check-i18n.sh [--strict|--prune [--apply]]
#   default:          prints the diff and exits 0 (CI-friendly)
#   --strict:         exits 1 if any used-but-undefined keys exist
#   --prune:          lists keys defined in bundles but not used in
#                     code (dry-run, no files touched)
#   --prune --apply:  actually removes the unused keys from every
#                     translation.json. Dangerous: a key built via
#                     template literal (t(`foo.${type}`)) is not
#                     caught by the static scanner and WILL be
#                     pruned if nothing else references it literally.
#                     Review the dry-run list before passing --apply.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"
STRICT=0
PRUNE=0
APPLY=0
case "${1:-}" in
  --strict) STRICT=1 ;;
  --prune)
    PRUNE=1
    if [ "${2:-}" = "--apply" ]; then APPLY=1; fi
    ;;
  "") ;;
  *)
    echo "unknown flag: ${1}" >&2
    echo "usage: $0 [--strict|--prune [--apply]]" >&2
    exit 2 ;;
esac

python3 - "$PROJECTS" "$STRICT" "$PRUNE" "$APPLY" <<'PY'
import json, os, re, sys, pathlib
projects = sys.argv[1]
strict = sys.argv[2] == "1"
prune = sys.argv[3] == "1"
apply_prune = sys.argv[4] == "1"

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

# Enumerate the bundle files once so prune can rewrite each in place
# with only its own keys removed.
bundles = []
if core_en.exists():
    bundles.append(core_en)
for lang_dir in sorted(afghan_locales.iterdir()):
    bundle = lang_dir / "translation.json"
    if bundle.exists():
        bundles.append(bundle)

available = set()
for b in bundles:
    with open(b) as f:
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

# --prune: list (and optionally delete) keys defined in bundles but
# not referenced by any literal t("…") call. --apply does the delete.
if prune:
    print()
    print("Prune candidates (defined but never used by a literal t('…') call):")
    if not unused:
        print("  (none)")
    else:
        for k in unused[:60]:
            print(f"  - {k}")
        if len(unused) > 60:
            print(f"  … and {len(unused) - 60} more")
        print()
        print(f"TOTAL: {len(unused)} key(s) across {len(bundles)} bundle file(s)")

    if unused and apply_prune:
        print()
        print("Applying prune (modifying bundle files in-place)…")
        unused_set = set(unused)

        def filter_dict(d, prefix=""):
            # Walk the nested dict and drop any leaf whose dotted
            # key is in the prune set. Collapse now-empty parents.
            out = {}
            for k, v in d.items():
                full = f"{prefix}{k}"
                if isinstance(v, dict):
                    pruned = filter_dict(v, full + ".")
                    if pruned:
                        out[k] = pruned
                else:
                    if full not in unused_set:
                        out[k] = v
            return out

        for b in bundles:
            with open(b) as f:
                data = json.load(f)
            new_data = filter_dict(data)
            if new_data != data:
                # Preserve 4-space indent + trailing newline (matches
                # the house style on every existing bundle).
                b.write_text(json.dumps(new_data, ensure_ascii=False, indent=4) + "\n")
                print(f"  rewrote {b.relative_to(projects)}")
        print("Done. Re-run without --apply to confirm 0 unused keys remain.")
    elif unused and not apply_prune:
        print()
        print("DRY RUN — nothing deleted. Pass --apply to remove these keys.")
        print("WARNING: review the list first — keys built via template")
        print("         literals (e.g. t(`foo.${type}`)) look unused to the")
        print("         scanner. Deleting them WILL break the UI.")
PY
