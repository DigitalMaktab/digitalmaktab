#!/usr/bin/env bash
# Container entrypoint. Prepares the persistent Render disk, then starts the API.
set -euo pipefail
DATA="${DATA_DIR:-/var/data}"

# Uploaded files, backups and generated documents live under /app/Resources.
# Keep them on the disk so redeploys don't wipe them; shipped files are copied
# in without overwriting anything already stored there.
if [ -d "$DATA" ]; then
  mkdir -p "$DATA/resources"
  if [ -d /app/Resources ] && [ ! -L /app/Resources ]; then
    cp -Rn /app/Resources/. "$DATA/resources/" 2>/dev/null || true
    rm -rf /app/Resources
  fi
  ln -sfn "$DATA/resources" /app/Resources
fi

# Data Protection key ring: the app refuses to start without the identity
# marker and never creates it in production. Provision it once, only for a
# brand-new empty directory, so a wrong/emptied mount still fails loudly.
KR="${DataProtection__KeyRingPath:-}"
if [ -n "$KR" ]; then
  mkdir -p "$KR"; chmod 700 "$KR"
  if [ ! -f "$KR/.digitalmaktab-key-ring" ] && [ -z "$(ls -A "$KR")" ]; then
    printf '%s' "${DataProtection__KeyRingId:?DataProtection__KeyRingId is required}" > "$KR/.digitalmaktab-key-ring"
    echo "start.sh: initialised new key ring marker in $KR"
  fi
fi

# Fresh database only: build the Core schema the way the load harness does (the
# historical migration chain cannot start from empty). No-op when tables exist.
dotnet /opt/digitalmaktab-bootstrap/digitalmaktab-bootstrap.dll

cd /app
exec dotnet digitalmaktabapi.dll
