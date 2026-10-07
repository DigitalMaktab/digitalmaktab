#!/usr/bin/env bash
# sync-dotnet.sh — replay the CLAUDE.md pack+restore ritual for the
# .NET packages. Cleans + rebuilds Core (so stale bin/ DLLs don't
# sneak into the nupkg), packs Abstractions + Core + the Afghan
# country package, wipes the NuGet caches those three packages live
# in, and runs `dotnet restore --force --no-cache` in the API host.
#
# Usage: ./scripts/sync-dotnet.sh
# After this runs you still need to restart `dotnet run` in
# digitalmaktab-api (`dotnet watch` doesn't detect transitive DLL
# swaps).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"
NUGET_LOCAL="$PROJECTS/.nuget-local"
CORE_DIR="$PROJECTS/digitalmaktab-core"
COUNTRY_DIR="$PROJECTS/digitalmaktab-country-afghanistan"
API_DIR="$PROJECTS/digitalmaktab-api"

mkdir -p "$NUGET_LOCAL"

echo "==> Cleaning + building Core (Release)"
(cd "$CORE_DIR" && dotnet clean -c Release >/dev/null && dotnet build -c Release >/dev/null)

echo "==> Packing Core.Abstractions"
(cd "$CORE_DIR" && dotnet pack \
  src/DigitalMaktab.Core.Abstractions/DigitalMaktab.Core.Abstractions.csproj \
  -c Release --no-build -o "$NUGET_LOCAL" >/dev/null)

echo "==> Packing Core"
(cd "$CORE_DIR" && dotnet pack \
  src/DigitalMaktab.Core/DigitalMaktab.Core.csproj \
  -c Release --no-build -o "$NUGET_LOCAL" >/dev/null)

echo "==> Cleaning + building + packing Afghan country package"
(cd "$COUNTRY_DIR" && dotnet clean -c Release >/dev/null \
  && dotnet build -c Release >/dev/null \
  && dotnet pack -c Release --no-build -o "$NUGET_LOCAL" >/dev/null)

echo "==> Clearing NuGet caches for the three local packages"
rm -rf \
  "$HOME/.nuget/packages/digitalmaktab.core" \
  "$HOME/.nuget/packages/digitalmaktab.core.abstractions" \
  "$HOME/.nuget/packages/digitalmaktab.country.afghanistan"
dotnet nuget locals http-cache --clear >/dev/null

echo "==> Restoring API (force, no cache)"
(cd "$API_DIR" && dotnet restore --force --no-cache >/dev/null)

echo "==> Building API"
(cd "$API_DIR" && dotnet build >/dev/null)

echo "==> Done. Restart 'dotnet run' in digitalmaktab-api to pick up the swap."
