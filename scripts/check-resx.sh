#!/usr/bin/env bash
# check-resx.sh — flag backend .resx keys that no C# code references.
# Sibling of check-i18n.sh's --prune mode but for the backend
# IStringLocalizer<T> + Resources/Localization/Controllers/*.resx
# surface area.
#
# For each <Name>.resx trio (base + .fa-AF + .ps-AF) under
# digitalmaktab-core and digitalmaktab-country-afghanistan, extract
# every <data name="…"> key and search the entire .cs tree for a
# literal "KEY" reference. A key with zero literal references is a
# prune candidate.
#
# Known limitation (same as check-i18n.sh): keys built via
# interpolation (localizer[$"Foo{bar}"]) look unreferenced to the
# scanner. Dry-run is default so false positives don't delete
# working strings.
#
# Usage: ./scripts/check-resx.sh [--prune [--apply]]
#   default:          summary + used/unused counts (CI-friendly)
#   --prune:          lists prune candidates (dry-run)
#   --prune --apply:  removes orphan <data> blocks from every
#                     base + locale-suffixed resx. Review the dry-run
#                     list first — see warning above.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"
PRUNE=0
APPLY=0
case "${1:-}" in
  --prune)
    PRUNE=1
    if [ "${2:-}" = "--apply" ]; then APPLY=1; fi
    ;;
  "") ;;
  *)
    echo "unknown flag: ${1}" >&2
    echo "usage: $0 [--prune [--apply]]" >&2
    exit 2 ;;
esac

python3 - "$PROJECTS" "$PRUNE" "$APPLY" <<'PY'
import re, sys, pathlib
from collections import defaultdict

projects = pathlib.Path(sys.argv[1])
prune = sys.argv[2] == "1"
apply_prune = sys.argv[3] == "1"

resx_dirs = [
    projects / "digitalmaktab-core/src/DigitalMaktab.Core/Resources/Localization/Controllers",
    projects / "digitalmaktab-country-afghanistan/Resources/Localization/Controllers",
]
cs_scan_dirs = [
    projects / "digitalmaktab-core/src",
    projects / "digitalmaktab-country-afghanistan",
    projects / "digitalmaktab-api",
]

name_pat = re.compile(r'<data\s+name="([^"]+)"')

# Build the full set of keys per base .resx (ignoring suffixed siblings).
keys_by_base = {}
for d in resx_dirs:
    if not d.exists():
        continue
    for resx in sorted(d.glob("*.resx")):
        if "." in resx.stem:
            continue  # skip Foo.fa-AF.resx — those are siblings
        try:
            text = resx.read_text()
        except Exception:
            continue
        keys = set(name_pat.findall(text))
        keys_by_base[resx] = keys

# Collate every .cs file's contents once. The reference check is a
# literal "key" substring search which is good enough for the
# IStringLocalizer<T>["KEY"] + L("KEY") + similar patterns the
# codebase actually uses. Dynamic keys ($"Foo{bar}") look
# unreferenced; the dry-run guard rail catches this.
cs_blob_parts = []
for root in cs_scan_dirs:
    if not root.exists():
        continue
    for p in root.rglob("*.cs"):
        if "/obj/" in str(p) or "/bin/" in str(p):
            continue
        try:
            cs_blob_parts.append(p.read_text())
        except Exception:
            continue
cs_blob = "\n".join(cs_blob_parts)

def referenced(key):
    # Match "KEY" with the quotes to avoid substring false positives
    # (a Comment or substring in another string won't trigger).
    return f'"{key}"' in cs_blob

# All-uppercase keys with underscores (A_MINUS, BLOOD_O, FIRST,
# APRIL, DARI, …) are almost always enum members accessed via
# localizer[enumVal.ToString()] — the scanner can't see .ToString()
# so they'd FALSELY look orphan. Mark them as "always keep" so the
# summary + prune list treat them as referenced regardless.
enum_like = re.compile(r'^[A-Z][A-Z0-9_]+$')
def is_enum_like(key):
    return bool(enum_like.match(key))

total_keys = 0
enum_like_kept = 0
unused_by_file = defaultdict(list)
for base, keys in keys_by_base.items():
    total_keys += len(keys)
    for k in sorted(keys):
        if referenced(k):
            continue
        if is_enum_like(k):
            enum_like_kept += 1
            continue
        unused_by_file[base].append(k)

unused_total = sum(len(v) for v in unused_by_file.values())
print("resx coverage check")
print(f"  base resx files:        {len(keys_by_base)}")
print(f"  defined keys:           {total_keys}")
print(f"  enum-like kept (unref): {enum_like_kept}  (interpolated via .ToString())")
print(f"  unreferenced keys:      {unused_total}")

if not prune:
    # Default summary: show the top offenders so devs eyeball cheaply.
    if unused_total:
        print()
        print("Top offenders (file → orphan count):")
        for base, keys in sorted(unused_by_file.items(), key=lambda kv: -len(kv[1]))[:10]:
            rel = base.relative_to(projects)
            print(f"  {len(keys):>4}  {rel}")
    sys.exit(0)

# --prune: full list
print()
print("Prune candidates (defined but no C# literal reference found):")
if not unused_by_file:
    print("  (none)")
else:
    for base in sorted(unused_by_file):
        rel = base.relative_to(projects)
        print(f"  {rel}  ({len(unused_by_file[base])}):")
        for k in unused_by_file[base][:20]:
            print(f"    - {k}")
        if len(unused_by_file[base]) > 20:
            print(f"    … and {len(unused_by_file[base]) - 20} more")

if not unused_by_file:
    sys.exit(0)

if not apply_prune:
    print()
    print("DRY RUN — nothing deleted. Pass --apply to remove these keys.")
    print("WARNING: keys built via interpolation (localizer[$\"Foo{bar}\"])")
    print("         look unreferenced to the scanner. Review the list first.")
    sys.exit(0)

# --apply: for each base resx, delete the orphan <data> blocks from
# the base AND every <base>.<culture>.resx sibling in the same dir.
# Blocks are deleted by matching the full <data name="KEY" …> …
# </data> extent (handles xml:space="preserve" + comment children).
print()
print("Applying prune (modifying .resx files in-place)…")

def strip_blocks(text, keys_to_remove):
    for key in keys_to_remove:
        # Match the whole <data name="KEY" …>…</data> block including
        # trailing newline + leading whitespace so the file stays tidy.
        # DOTALL so the content spans lines.
        pat = re.compile(
            r'[ \t]*<data\s+name="' + re.escape(key) + r'"[^>]*>.*?</data>\s*\n',
            re.DOTALL)
        text = pat.sub("", text)
    return text

for base, keys in unused_by_file.items():
    siblings = [base]
    stem = base.stem
    for sib in sorted(base.parent.glob(f"{stem}.*.resx")):
        siblings.append(sib)
    for s in siblings:
        try:
            text = s.read_text()
        except Exception:
            continue
        new_text = strip_blocks(text, keys)
        if new_text != text:
            s.write_text(new_text)
            print(f"  rewrote {s.relative_to(projects)}")
print("Done. Re-run without --apply to confirm 0 unreferenced keys remain.")
PY
