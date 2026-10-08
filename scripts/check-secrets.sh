#!/usr/bin/env bash
# check-secrets.sh — pre-commit regex scan over staged files for
# patterns that look like credentials. Blocks the commit on a hit
# so a stray .env / connection string / API key doesn't land in
# git history (where recovery means a force-push, which this repo
# set rejects by convention).
#
# Scope: files currently in the index for the active commit only.
# Already-tracked files that haven't been re-staged are NOT scanned
# — a baseline sweep of history is a separate exercise.
#
# Patterns covered (one line each so grep -nE is cheap):
#   - AWS access key id         AKIA[0-9A-Z]{16}
#   - SendGrid API key          SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}
#   - Postgres connection pw    Password=\S{4,}      (within a conn string)
#   - Generic private key head  -----BEGIN( [A-Z ]+)? PRIVATE KEY-----
#   - OpenAI / Anthropic key    sk-(ant-|proj-)?[A-Za-z0-9]{32,}
#   - GitHub token              ghp_[A-Za-z0-9]{30,}
#
# Escape hatch: SKIP_SECRET_SCAN=1 git commit — intentional for a
# fixture file that embeds a known-fake key. Document the exemption
# in the commit message when you use it.
set -euo pipefail

if [ "${SKIP_SECRET_SCAN:-0}" = "1" ]; then
  echo "check-secrets: SKIP_SECRET_SCAN=1 — skipping"
  exit 0
fi

STAGED="$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null)"
if [ -z "$STAGED" ]; then
  exit 0
fi

# Scan only text files (binary bodies are noise + grep is slow on them).
# `git grep` on the index gives us the staged content, not the working
# tree, so an in-flight edit after `git add` is checked at commit time.
TMP_HITS="$(mktemp)"
trap 'rm -f "$TMP_HITS"' EXIT

PATTERNS=(
  'AKIA[0-9A-Z]{16}'
  'SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}'
  'Password=[^;"'"'"' ]{4,}'
  '-----BEGIN( [A-Z ]+)? PRIVATE KEY-----'
  'sk-(ant-|proj-)?[A-Za-z0-9]{32,}'
  'ghp_[A-Za-z0-9]{30,}'
)

# Allow-list substrings. A match that contains any of these is skipped
# (false-positive guard for conventional dev-tooling placeholders).
ALLOWLIST=(
  'Password=postgres'          # dev-only docker-compose default
  'Password=yourStrong'        # SQL Server test container convention
  'Password=changeme'          # placeholder in example configs
)

while IFS= read -r file; do
  [ -z "$file" ] && continue
  # Skip paths we never want to scan (binary + vendored + self).
  case "$file" in
    *.png|*.jpg|*.jpeg|*.gif|*.ico|*.pdf|*.zip|*.woff*|*.ttf|*.eot) continue ;;
    *.lock|*.lockb|package-lock.json|yarn.lock) continue ;;
    *node_modules/*|*/bin/*|*/obj/*) continue ;;
    scripts/check-secrets.sh) continue ;;
  esac
  # Pull the staged content (not working tree) so late edits are caught.
  content="$(git show ":$file" 2>/dev/null || true)"
  [ -z "$content" ] && continue

  for pattern in "${PATTERNS[@]}"; do
    while IFS= read -r match; do
      [ -z "$match" ] && continue
      skip=0
      for allow in "${ALLOWLIST[@]}"; do
        if printf '%s' "$match" | grep -qF "$allow"; then
          skip=1; break
        fi
      done
      if [ $skip -eq 0 ]; then
        printf '  %s: %s\n' "$file" "$match" >> "$TMP_HITS"
      fi
    done < <(printf '%s\n' "$content" | grep -nE -- "$pattern" || true)
  done
done <<< "$STAGED"

if [ -s "$TMP_HITS" ]; then
  echo "check-secrets: BLOCKED — the following staged lines look like credentials:" >&2
  cat "$TMP_HITS" >&2
  echo "" >&2
  echo "If this is a known-safe fixture / placeholder, retry with:" >&2
  echo "  SKIP_SECRET_SCAN=1 git commit …" >&2
  echo "and explain the exemption in the commit message." >&2
  exit 1
fi

echo "check-secrets: ok"
