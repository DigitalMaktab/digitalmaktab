#!/usr/bin/env bash
# check-no-raw-textareas.sh — guard against raw `<textarea>` elements
# in the SPA.
#
# Rule: every multi-line text field routes through either
# `AppFormInput type="textArea"` (inside an AppForm / Formik context)
# or `AppTextArea` (controlled, non-Formik use). Both share the same
# label chrome, required asterisk, and Bootstrap form-control token
# wiring. A hand-rolled `<textarea className="form-control">` drifts
# on every token tweak and bypasses the chrome.
#
# Scan: every .tsx under digitalmaktab-spa/src. Flag any `<textarea`
# tag opening — same shape as check-no-raw-alerts.sh.
#
# Usage: ./scripts/check-no-raw-textareas.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"
SPA_SRC="$PROJECTS/digitalmaktab-spa/src"

python3 - "$SPA_SRC" <<'PY'
import re, sys, pathlib
spa = pathlib.Path(sys.argv[1])
if not spa.exists():
    print(f"ERROR: {spa} not found", file=sys.stderr); sys.exit(1)

# Flag `<textarea ` or `<textarea>` or `<textarea\n` openings.
# Excludes self-closing JSX comments and strings — the pattern must
# look like a JSX open tag.
pat = re.compile(r'<textarea[\s>]')

issues = []
scanned = 0
for tsx in sorted(spa.rglob("*.tsx")):
    scanned += 1
    text = tsx.read_text()
    for lineno, line in enumerate(text.splitlines(), start=1):
        if pat.search(line):
            issues.append((tsx, lineno, line.strip()))

print("raw-textarea guard")
print(f"  files scanned: {scanned}")
print(f"  violations:    {len(issues)}")

if not issues:
    print("  ok — every textarea routes through AppFormInput/AppTextArea")
    sys.exit(0)

print()
print("RAW TEXTAREA — use AppFormInput type=\"textArea\" (inside AppForm)")
print("or AppTextArea (controlled, non-Formik) from @digitalmaktab/spa-core:")
for tsx, lineno, snippet in issues:
    rel = tsx.relative_to(spa.parent)
    print(f"  × {rel}:{lineno}")
    print(f"      {snippet[:120]}")
print()
print("Fix: swap the raw <textarea className=\"form-control\" value={v}")
print('  onChange={e => setV(e.target.value)} /> for')
print('    <AppTextArea name="..." value={v} onChange={setV} /> (non-form)')
print('  or <AppFormInput name="..." type="textArea" label="..." /> (form).')
sys.exit(1)
PY
