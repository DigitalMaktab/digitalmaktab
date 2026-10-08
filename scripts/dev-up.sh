#!/usr/bin/env bash
# dev-up.sh — single-command local-dev bootstrap. Starts the API,
# the SPA shell, and both watchers (watch-dotnet / watch-spa) under
# one supervisor so Ctrl+C tears everything down cleanly.
#
# Each child's output is prefixed so operators can tell at a glance
# which process a given line came from.
#
# Expected flow for a fresh clone:
#   1. ./scripts/install-hooks.sh    (one-time, auto-discovers repos)
#   2. ./scripts/sync-all.sh         (prime the tarball + nupkg caches)
#   3. ./scripts/dev-up.sh           (this script)
#
# After dev-up is running, edits in spa-core / Afghan / .NET packages
# flow into the running shell / API without manual sync — the
# watchers pick up fs changes and replay the pack+swap in-place.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"
SPA_DIR="$PROJECTS/digitalmaktab-spa"

if [ ! -d "$SPA_DIR" ]; then
  echo "ERROR: $SPA_DIR not found — expected sibling of digitalmaktab/" >&2
  exit 1
fi

# PIDs we need to clean up on exit. Populated as each child starts.
PIDS=()

cleanup() {
  trap - INT TERM EXIT
  echo
  echo "[dev-up] shutting down ${#PIDS[@]} child process(es)…"
  for pid in "${PIDS[@]}"; do
    # Kill the process group so dotnet / npm / node children die too.
    kill -TERM "-$pid" 2>/dev/null || true
  done
  # Give them a moment to exit cleanly; then SIGKILL anything still up.
  sleep 2
  for pid in "${PIDS[@]}"; do
    kill -KILL "-$pid" 2>/dev/null || true
  done
}
trap cleanup INT TERM EXIT

# Launch a child in its own process group so cleanup can take down
# the whole subtree with one signal. $1 = label (for the prefix),
# rest = command.
launch() {
  local label="$1"; shift
  (
    # Each line of the child's stdout gets 'label | ' prefixed so the
    # multiplexed stream stays legible. stderr merges in.
    set -o pipefail
    setsid "$@" 2>&1 | sed -u "s/^/[$label] /"
  ) &
  PIDS+=($!)
}

echo "[dev-up] starting api + spa + watchers (Ctrl+C to stop)"
echo

launch "api"      "$ROOT/dev-api.sh"
launch "spa"      bash -c "cd '$SPA_DIR' && npm start"
launch "watch-sp" node "$ROOT/watch-spa.mjs"
launch "watch-nt" node "$ROOT/watch-dotnet.mjs"

# wait returns when any child exits OR the trap fires. If a child
# dies on its own we tear down the rest — the dev-up contract is
# all-or-nothing to avoid 'the watcher is dead but you still see
# the stale shell' states.
wait -n 2>/dev/null || true
echo "[dev-up] a child exited — tearing down the rest"
