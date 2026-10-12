#!/usr/bin/env bash
# check-i18n-parity.sh — enforce the golden rule that every string
# lands in all three supported locales (en-US + fa-AF + ps-AF),
# both frontend (translation.json) and backend (.resx trios).
#
# Catches the common mistake of adding a key to one locale (usually
# en-US) and forgetting the Dari + Pashto variants — the UI then
# silently falls back to English for Afghan users.
#
# Scope:
#   frontend:
#     digitalmaktab-spa-core/src/locales/<lang>/translation.json
#     digitalmaktab-spa-country-afghanistan/src/locales/<lang>/translation.json
#     (each repo's bundles must have matching key sets across every
#     locale shipped from that repo)
#   backend:
#     digitalmaktab-core/src/DigitalMaktab.Core/Resources/Localization/
#       Controllers/<Name>.resx (+ .fa-AF.resx + .ps-AF.resx)
#     digitalmaktab-country-afghanistan/Resources/Localization/
#       Controllers/<Name>.resx (+ .fa-AF.resx + .ps-AF.resx)
#
# Usage: ./scripts/check-i18n-parity.sh [--strict]
#   default: prints the diff and exits 0 (CI-friendly summary)
#   --strict: exits 1 if any locale is missing any key
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"
STRICT=0
if [ "${1:-}" = "--strict" ]; then STRICT=1; fi

python3 - "$PROJECTS" "$STRICT" <<'PY'
import json, os, re, sys, pathlib
from collections import defaultdict

projects = pathlib.Path(sys.argv[1])
strict = sys.argv[2] == "1"

# ------------------------------------------------------------------
# Frontend: the SPA merges spa-core en-US + spa-country-afghanistan
# {fa-AF, ps-AF}. The real rule:
#   1. Every spa-core en-US key must appear in BOTH fa-AF and ps-AF
#      (so Afghan users can see every shell string translated).
#   2. fa-AF and ps-AF must have the same key set (Dari ↔ Pashto
#      parity — a key only in one is almost always an oversight).
# Keys that exist in fa-AF/ps-AF but not en-US are legitimate — the
# country package can add Afghan-specific terminology or override
# shell terms.
# ------------------------------------------------------------------

def flatten(d, prefix=""):
    out = {}
    for k, v in d.items():
        key = f"{prefix}{k}"
        if isinstance(v, dict):
            out.update(flatten(v, key + "."))
        else:
            out[key] = v
    return out

parse_errors = []  # (path, exception-message) — fatal in --strict

def load_bundle(path):
    if not path.exists():
        return None
    try:
        return set(flatten(json.loads(path.read_text())).keys())
    except Exception as e:
        # Previously this printed a WARN and continued with an empty
        # set — a corrupted bundle would then look like "every en-US
        # key is missing" which drowns the actual parse error in the
        # resulting flood of parity false-positives. Capture + report
        # it as its own blocking issue instead.
        parse_errors.append((str(path), str(e)))
        return set()

core_en = load_bundle(projects / "digitalmaktab-spa-core/src/locales/en-US/translation.json")
country_fa = load_bundle(projects / "digitalmaktab-spa-country-afghanistan/src/locales/fa-AF/translation.json")
country_ps = load_bundle(projects / "digitalmaktab-spa-country-afghanistan/src/locales/ps-AF/translation.json")

# Mobile tree ships all three locales in the SAME package (no
# core/country split like the SPA has). Different package, same
# three-way parity rule: every key in any one must be in the other
# two. Auto-discover each mobile country package.
mobile_bundles = {}  # package-name → {locale → key-set}
for mdir in sorted(projects.glob("digitalmaktab-mobile-country-*")):
    locales_dir = mdir / "src/locales"
    if not locales_dir.exists(): continue
    bundles = {}
    for sub in ("en-US", "fa-AF", "ps-AF"):
        b = load_bundle(locales_dir / sub / "translation.json")
        if b is not None:
            bundles[sub] = b
    if len(bundles) >= 2:
        mobile_bundles[mdir.name] = bundles

# Some key families legitimately diverge between en-US and the Afghan
# locales. Keys matching any prefix below are allowed to be present in
# en-US without a corresponding entry in fa-AF/ps-AF (and vice versa).
# Keep this list TINY — every exception is a hiding place for real
# missing-translation bugs.
AFGHAN_EXEMPT_PREFIXES = (
    # Calendar month names: en-US uses Gregorian (january…december);
    # Afghan locales use Jalali (hamal…hoot). Different leaf names
    # under the same parent path by design.
    "calendar.month.",
)

# Prefixes that are LEGITIMATELY present only in Afghan locales
# (country-specific terminology — the shell doesn't ship these
# strings because the fields don't exist on Core.Student/Teacher,
# only on the Afghan TPT extension). The advisory block below
# skips these when flagging "possibly missing from en-US" so the
# signal stays signal.
COUNTRY_ONLY_PREFIXES = (
    "afghanDatePicker.",
    "afghanStudentDetails.",
    "afghanTeacherDetails.",
    "country.afghanistan.",
    "ministry.",
    "ministryReports.",
    "sidebar.ministryReports.",
)

def is_exempt(key):
    return any(key.startswith(p) for p in AFGHAN_EXEMPT_PREFIXES)

def is_country_only(key):
    return any(key.startswith(p) for p in COUNTRY_ONLY_PREFIXES)

frontend_issues = []  # (bucket-label, locale, key)
if core_en and country_fa is not None:
    for missing in sorted(core_en - country_fa):
        if is_exempt(missing): continue
        frontend_issues.append(("shell strings (spa-core en-US)", "fa-AF", missing))
if core_en and country_ps is not None:
    for missing in sorted(core_en - country_ps):
        if is_exempt(missing): continue
        frontend_issues.append(("shell strings (spa-core en-US)", "ps-AF", missing))
if country_fa is not None and country_ps is not None:
    for missing in sorted(country_fa - country_ps):
        if is_exempt(missing): continue
        frontend_issues.append(("country keys (fa-AF ↔ ps-AF)", "ps-AF", missing))
    for missing in sorted(country_ps - country_fa):
        if is_exempt(missing): continue
        frontend_issues.append(("country keys (fa-AF ↔ ps-AF)", "fa-AF", missing))

# Mobile tree: strict three-way parity within each country package.
# Unlike the SPA — where en-US lives in spa-core and the Afghan
# country package ships only fa/ps + a thin en-US override — the
# mobile country package ships all three locales side-by-side, so
# the simpler rule 'every key must be in every locale' applies.
for pkg_name, bundles in mobile_bundles.items():
    all_keys = set().union(*bundles.values())
    label = f"mobile ({pkg_name})"
    for locale, keys in bundles.items():
        for missing in sorted(all_keys - keys):
            if is_exempt(missing): continue
            frontend_issues.append((label, locale, missing))

# Advisory (non-blocking) — keys shared between BOTH Afghan locales
# that en-US doesn't carry. The parity rule allows country packages
# to add their own terminology; this advisory catches the case where
# a UI string was added to the Afghan bundles but someone forgot to
# add the en-US fallback. Known country-only prefixes
# (COUNTRY_ONLY_PREFIXES) are skipped so the signal stays signal.
advisory_only_in_afghan = []
if core_en and country_fa is not None and country_ps is not None:
    for missing in sorted((country_fa & country_ps) - core_en):
        if is_country_only(missing) or is_exempt(missing): continue
        advisory_only_in_afghan.append(missing)

# ------------------------------------------------------------------
# Backend: .resx trios. {name}.resx is the base (en-US); the Dari
# (.fa-AF.resx) and Pashto (.ps-AF.resx) siblings must carry the
# same <data name="..."> set.
# ------------------------------------------------------------------

backend_sources = [
    projects / "digitalmaktab-core/src/DigitalMaktab.Core/Resources/Localization/Controllers",
    projects / "digitalmaktab-country-afghanistan/Resources/Localization/Controllers",
]

name_pat = re.compile(r'<data\s+name="([^"]+)"')

def extract_keys(path):
    try:
        return set(name_pat.findall(path.read_text()))
    except Exception:
        return set()

def find_duplicate_keys(path):
    # Resx silently keeps the LAST occurrence of a duplicate
    # <data name="..."> — a merge conflict can hide translation
    # losses. Return list of (name, count) for names seen >1 times.
    try:
        names = name_pat.findall(path.read_text())
    except Exception:
        return []
    seen = {}
    for n in names:
        seen[n] = seen.get(n, 0) + 1
    return [(n, c) for n, c in seen.items() if c > 1]

backend_issues = []  # (base-path, missing-locale, key)
duplicate_issues = []  # (file-path, key, count)
for src in backend_sources:
    if not src.exists():
        continue
    # Duplicate-key sweep covers every resx (base + culture siblings).
    for resx in sorted(src.glob("*.resx")):
        for key, count in find_duplicate_keys(resx):
            duplicate_issues.append((str(resx.relative_to(projects)), key, count))
    for base in sorted(src.glob("*.resx")):
        name = base.stem
        # Skip culture-suffixed files (they're the siblings).
        if "." in name:
            continue
        locales = {
            "en-US": base,
            "fa-AF": src / f"{name}.fa-AF.resx",
            "ps-AF": src / f"{name}.ps-AF.resx",
        }
        per_locale = {loc: extract_keys(p) for loc, p in locales.items() if p.exists()}
        if len(per_locale) < 2:
            continue
        all_keys = set().union(*per_locale.values())
        for locale, keys in per_locale.items():
            for missing in sorted(all_keys - keys):
                backend_issues.append((str(base.relative_to(projects)), locale, missing))

# ------------------------------------------------------------------
# Report
# ------------------------------------------------------------------

print("i18n parity check")
print(f"  frontend bundles scanned: core-en={bool(core_en)} fa={country_fa is not None} ps={country_ps is not None}")
print(f"  mobile packages scanned:  {len(mobile_bundles)}")
print(f"  backend sources scanned:  {len(backend_sources)}")
print(f"  frontend issues:          {len(frontend_issues)}")
print(f"  backend issues:           {len(backend_issues)}")
print(f"  resx duplicate keys:      {len(duplicate_issues)}")
print(f"  json parse errors:        {len(parse_errors)}")
print(f"  advisory (only in Afghan): {len(advisory_only_in_afghan)}  (not blocking — review for en-US gaps)")

if advisory_only_in_afghan:
    print()
    print("Advisory — keys in BOTH fa-AF + ps-AF but NOT en-US (first 20):")
    print("  (legitimate country-specific keys should be added to COUNTRY_ONLY_PREFIXES in this script;")
    print("   anything else is probably an accidental en-US gap — see auditLog incident 2026-10)")
    for k in advisory_only_in_afghan[:20]:
        print(f"  - {k}")
    if len(advisory_only_in_afghan) > 20:
        print(f"  … and {len(advisory_only_in_afghan) - 20} more")

if parse_errors:
    print()
    print("JSON parse errors (fix these FIRST — downstream parity output is unreliable while bundles don't parse):")
    for p, err in parse_errors:
        print(f"  {p}")
        print(f"    × {err}")

def group_report(issues, header, max_each=40):
    if not issues:
        return
    grouped = defaultdict(lambda: defaultdict(list))  # source -> locale -> [keys]
    for src, locale, key in issues:
        grouped[src][locale].append(key)
    print()
    print(header)
    for src in sorted(grouped):
        print(f"  {src}")
        for locale in sorted(grouped[src]):
            keys = grouped[src][locale]
            shown = keys[:max_each]
            overflow = len(keys) - len(shown)
            print(f"    missing in {locale} ({len(keys)}):")
            for k in shown:
                print(f"      - {k}")
            if overflow > 0:
                print(f"      … and {overflow} more")

group_report(frontend_issues, "Frontend (translation.json)")
group_report(backend_issues,  "Backend (.resx trios)")

if duplicate_issues:
    print()
    print("Resx duplicate keys (last entry silently wins — fix now)")
    for path, key, count in sorted(duplicate_issues):
        print(f"  {path}")
        print(f"    × {key} (×{count})")

if strict and (frontend_issues or backend_issues or duplicate_issues or parse_errors):
    sys.exit(1)
PY
