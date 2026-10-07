#!/usr/bin/env bash
# sync-all.sh — one-shot: rebuild + repack + swap both the .NET and
# SPA package chains after a cross-cutting change (e.g. a new field
# that lives on Core.Student and also in the Afghan editor).
#
# Usage: ./scripts/sync-all.sh
# After this runs, restart BOTH `dotnet run` and `npm start`.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "===== .NET =====" ; "$ROOT/sync-dotnet.sh"
echo
echo "===== SPA ====="  ; "$ROOT/sync-spa.sh"

echo
echo "===== Done. Restart dotnet run + npm start to serve the new bits. ====="
