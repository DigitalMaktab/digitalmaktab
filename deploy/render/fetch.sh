#!/usr/bin/env bash
# Clones every sibling repo at the exact commit pinned in versions.env into a
# workspace. Access uses per-repo read-only GitHub deploy keys supplied as the
# Render secret file "deploy_keys" (lines: "<repo> <base64 private key>"),
# mounted into the Docker build as a BuildKit secret. publish.sh --setup-keys
# generates and registers them.
set -euo pipefail
W="$1"; HERE="$(cd "$(dirname "$0")" && pwd)"
KEYS="${DEPLOY_KEYS_FILE:-/run/secrets/deploy_keys}"
[ -f "$KEYS" ] || KEYS=/etc/secrets/deploy_keys
[ -f "$KEYS" ] || { echo "fetch.sh: deploy_keys secret not available" >&2; exit 1; }
SSHDIR="$(mktemp -d)"; trap 'rm -rf "$SSHDIR"' EXIT
cp "$HERE/github_known_hosts" "$SSHDIR/known_hosts"
mkdir -p "$W"
while read -r repo sha; do
  case "$repo" in ''|\#*) continue;; esac
  key="$(awk -v r="$repo" '$1==r {print $2}' "$KEYS")"
  [ -n "$key" ] || { echo "fetch.sh: no deploy key for $repo" >&2; exit 1; }
  printf '%s' "$key" | base64 -d > "$SSHDIR/$repo"; chmod 600 "$SSHDIR/$repo"
  echo "==> $repo @ ${sha:0:12}"
  git init -q "$W/$repo"
  GIT_SSH_COMMAND="ssh -i $SSHDIR/$repo -o IdentitiesOnly=yes -o UserKnownHostsFile=$SSHDIR/known_hosts -o StrictHostKeyChecking=yes" \
    git -C "$W/$repo" fetch -q --depth 1 "git@github.com:DigitalMaktab/${repo}.git" "$sha"
  git -C "$W/$repo" checkout -q FETCH_HEAD
  rm -rf "$W/$repo/.git"
done < "$HERE/versions.env"
