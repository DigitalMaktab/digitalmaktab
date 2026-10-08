#!/usr/bin/env bash
# check-pkg-versions.sh — enforce that every consumer package.json
# declares @digitalmaktab/* dependencies at the version the owning
# package itself actually ships. A spa-core version bump that
# forgets to update the country package's declaration silently
# installs an outdated tarball on next sync — the mismatch only
# surfaces as 'unknown export' TS errors deep in a build.
#
# Covers both dependency forms used in the tree:
#   - semver string:  "@digitalmaktab/spa-core": "0.1.0-alpha"
#   - file: override: "@digitalmaktab/spa-core":
#         "file:../.npm-local/digitalmaktab-spa-core-0.1.0-alpha.tgz"
# A mismatch on EITHER form is drift.
#
# Does NOT scan the shell (digitalmaktab-spa) — the shell
# intentionally omits @digitalmaktab deps from package.json; sync-
# spa.sh populates its node_modules by tarball extraction.
#
# Usage: ./scripts/check-pkg-versions.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"

python3 - "$PROJECTS" <<'PY'
import json, re, sys, pathlib
projects = pathlib.Path(sys.argv[1])

# Owners: every sibling repo (digitalmaktab-*) that publishes an
# @digitalmaktab/* npm package in its own package.json. Auto-
# discovered so mobile / future-platform siblings slot in without
# this script needing an edit — same convention as install-hooks.sh
# + sync-dotnet.sh + sync-spa.sh.
owner_version = {}
for d in sorted(projects.iterdir()):
    if not d.is_dir(): continue
    name_ok = d.name == "digitalmaktab" or d.name.startswith("digitalmaktab-")
    if not name_ok: continue
    pj = d / "package.json"
    if not pj.exists(): continue
    try:
        data = json.loads(pj.read_text())
    except Exception:
        continue
    name = data.get("name")
    version = data.get("version")
    if name and name.startswith("@digitalmaktab/") and version:
        owner_version[name] = version

# Consumers: every package.json under projects/ that declares at
# least one @digitalmaktab/* dep in dependencies/devDependencies/
# overrides. Shell is deliberately excluded (sync-spa.sh pre-
# populates its node_modules; package.json doesn't declare the
# deps).
consumer_files = []
for d in projects.iterdir():
    if not d.is_dir(): continue
    if d.name == "digitalmaktab-spa": continue  # excluded by design
    pj = d / "package.json"
    if not pj.exists(): continue
    text = pj.read_text()
    if "@digitalmaktab/" not in text: continue
    consumer_files.append(pj)

issues = []
for pj in sorted(consumer_files):
    data = json.loads(pj.read_text())
    for section in ("dependencies", "devDependencies", "overrides"):
        for pkg, decl in (data.get(section) or {}).items():
            if not pkg.startswith("@digitalmaktab/"): continue
            if pkg not in owner_version:
                issues.append((str(pj.relative_to(projects)),
                               section, pkg, decl, "owner not found"))
                continue
            expected = owner_version[pkg]
            # Match the version in the declaration. For a file:
            # tarball path, require it to END with -<expected>.tgz
            # (filenames + versions both contain hyphens, so
            # end-anchored match on the owner's version is the only
            # unambiguous read). For a semver string, direct equality.
            ok = False
            if decl.startswith("file:"):
                ok = decl.endswith(f"-{expected}.tgz")
            else:
                ok = decl == expected
            if not ok:
                issues.append((str(pj.relative_to(projects)),
                               section, pkg, decl,
                               f"owner ships {expected}"))

print("pkg-version sync check")
print(f"  owners mapped:    {len(owner_version)}")
print(f"  consumers scanned: {len(consumer_files)}")
print(f"  mismatches:        {len(issues)}")

if not issues:
    print("  ok — every @digitalmaktab/* dependency agrees with its owner")
    sys.exit(0)

print()
print("DRIFT DETECTED")
for pj, section, pkg, decl, note in issues:
    print(f"  {pj} ({section})")
    print(f"    - {pkg} = {decl}")
    print(f"      {note}")
print()
print("Fix: edit the consumer's package.json to match the owner's version.")
sys.exit(1)
PY
