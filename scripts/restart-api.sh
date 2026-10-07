#!/usr/bin/env bash
# restart-api.sh — SIGTERM the dotnet process listening on :5000.
# If the API is being supervised by dev-api.sh (recommended), the
# wrapper's loop boots a fresh dotnet run on its own and the swap
# just made via sync-dotnet.sh takes effect automatically.
#
# If the user runs `dotnet run` or `dotnet watch run` in a raw
# terminal, this still kills it — but they'll have to re-start it
# by hand. The script prints a hint when that's the case.
#
# Usage: ./scripts/restart-api.sh
set -uo pipefail

API_PORT="${API_PORT:-5000}"
PID="$(lsof -ti:"$API_PORT" 2>/dev/null | head -1 || true)"

if [ -z "$PID" ]; then
  echo "[restart-api] nothing listening on :$API_PORT — nothing to restart"
  exit 0
fi

# Is the parent process a dev-api.sh supervisor?
PARENT_CMD="$(ps -p "$(ps -o ppid= -p "$PID" | tr -d ' ')" -o command= 2>/dev/null || true)"
SUPERVISED=0
if echo "$PARENT_CMD" | grep -q "dev-api.sh"; then
  SUPERVISED=1
fi

echo "[restart-api] killing dotnet pid $PID"
kill "$PID" || true

# Wait for the port to free up before returning (max 10s). The sync
# script's exit will often be followed by a `curl` smoke test, which
# would otherwise race the restart.
for _ in $(seq 1 50); do
  if ! lsof -ti:"$API_PORT" >/dev/null 2>&1; then break; fi
  sleep 0.2
done

if [ $SUPERVISED -eq 1 ]; then
  echo "[restart-api] dev-api.sh will boot a fresh instance"
else
  echo "[restart-api] HINT: run via scripts/dev-api.sh so restarts are automatic"
fi
