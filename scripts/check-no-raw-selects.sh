#!/usr/bin/env bash
# check-no-raw-selects.sh — guard against raw `<select>` elements
# in the SPA.
#
# Rule: every dropdown routes through either `AppFormSelect` (inside
# an AppForm / Formik context, with a Formik-aware child select),
# `AppEnumFilterSelect` (standalone enum / scope filter), or one of
# the typed select wrappers (AppCourseSelect, AppClassSelect, etc.).
# A hand-rolled `<select className="form-control">` drifts on every
# token tweak and breaks the shared chrome.
#
# Allowlist marker: lines containing `raw-select-exception` on the
# previous ~5 lines are skipped — reserved for Formik-wired helpers
# that intentionally render a raw select behind useField().
#
# AppFormSelect's cloneElement contract also requires a raw `<select>`
# child when the caller owns the <option> list — the one place that
# applies (StudentEditor's studentStatus) uses the inline
# `raw-select-exception` marker.
#
# Usage: ./scripts/check-no-raw-selects.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"
SPA_SRC="$PROJECTS/digitalmaktab-spa/src"

python3 - "$SPA_SRC" <<'PY'
import re, sys, pathlib
spa = pathlib.Path(sys.argv[1])
if not spa.exists():
    print(f"ERROR: {spa} not found", file=sys.stderr); sys.exit(1)

# Flag `<select ` / `<select>` / `<select\n` openings.
pat = re.compile(r'<select[\s>]')

# Allowlist: if any line within WINDOW lines above the <select> contains
# `raw-select-exception`, the match is intentional and skipped.
WINDOW = 15

def strip_comments(line: str) -> str:
    """Remove the `//…` tail (JS line comment) and leading `*` block-comment
    continuation. JSX comments `{/* … */}` are matched by the leading `{/*`
    pattern — simplest to drop the whole line when that's the opener."""
    s = line
    # Drop `// …` tail. Not perfect — won't ignore `//` inside a string
    # literal — but these guard-check files rarely build literals mid-tag.
    i = s.find("//")
    if i >= 0:
        s = s[:i]
    stripped = s.lstrip()
    # Block-comment continuation lines usually start with `*`.
    if stripped.startswith("*"):
        return ""
    # JSX inline comment `{/* … */}` — drop the comment span.
    s = re.sub(r"\{/\*.*?\*/\}", "", s)
    # Open block comment on this line → drop from the opener on.
    j = s.find("/*")
    if j >= 0:
        s = s[:j]
    return s

issues = []
scanned = 0
for tsx in sorted(spa.rglob("*.tsx")):
    scanned += 1
    lines = tsx.read_text().splitlines()
    in_block_comment = False  # True while we're inside a multi-line /* … */ / {/* … */} span
    for i, line in enumerate(lines):
        # Track multi-line block comments. Opener wins first; closer resets.
        stripped_full = line
        if in_block_comment:
            # Still inside — look for a closer.
            close_idx = line.find("*/")
            if close_idx == -1:
                continue  # entire line is comment
            # Trim off the already-closed prefix; the rest of the line is live code.
            stripped_full = line[close_idx + 2:]
            in_block_comment = False
        # Does this line open a block comment without closing it?
        # Walk alternating "/*" / "*/" to detect an open at end-of-line.
        tail = stripped_full
        open_pending = False
        while True:
            o = tail.find("/*")
            if o == -1:
                break
            c = tail.find("*/", o + 2)
            if c == -1:
                open_pending = True
                tail = tail[:o]
                break
            tail = tail[:o] + tail[c + 2:]
        candidate_live = tail
        if open_pending:
            in_block_comment = True
        # Apply line-comment stripping on top of what's left.
        candidate = strip_comments(candidate_live)
        if not pat.search(candidate):
            continue
        # Look back for an allowlist marker.
        window = lines[max(0, i - WINDOW):i]
        if any("raw-select-exception" in w for w in window):
            continue
        issues.append((tsx, i + 1, line.strip()))

print("raw-select guard")
print(f"  files scanned: {scanned}")
print(f"  violations:    {len(issues)}")

if not issues:
    print("  ok — every <select> routes through a shared primitive")
    sys.exit(0)

print()
print("RAW SELECT — use AppEnumFilterSelect (standalone enum / scope filter),")
print("AppFormSelect (inside AppForm with a Formik-aware child), or one of the")
print("typed select wrappers (AppCourseSelect, AppClassSelect, …). If the raw")
print("<select> is intentional (Formik useField wrapper), add a comment")
print("containing `raw-select-exception` within 8 lines above the tag.")
for tsx, lineno, snippet in issues:
    rel = tsx.relative_to(spa.parent)
    print(f"  × {rel}:{lineno}")
    print(f"      {snippet[:120]}")
sys.exit(1)
PY
