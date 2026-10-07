#!/usr/bin/env bash
# dev-api.sh — run the API in a supervised loop so `restart-api.sh`
# (and watch-dotnet.mjs) can SIGTERM the dotnet process and have it
# come back on its own. `dotnet watch run` restarts on source
# changes but not on signal exit; this wrapper does.
#
# Usage: ./scripts/dev-api.sh
# Stop: Ctrl+C (the trap drops out of the loop).
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"
API_DIR="$PROJECTS/digitalmaktab-api"

STOP=0
trap 'STOP=1' INT TERM

echo "[dev-api] supervising 'dotnet run' in $API_DIR"
echo "[dev-api] send SIGTERM to the inner dotnet (or run restart-api.sh)"
echo "[dev-api] to recycle without killing this wrapper"
echo

while [ $STOP -eq 0 ]; do
  (cd "$API_DIR" && dotnet run) || true
  if [ $STOP -eq 1 ]; then break; fi
  echo
  echo "[dev-api] dotnet exited — restarting in 1s"
  sleep 1
done

echo
echo "[dev-api] stopped"
