#!/usr/bin/env bash
# sync-dotnet.sh — replay the CLAUDE.md pack+restore ritual for the
# .NET packages. Cleans + rebuilds Core (so stale bin/ DLLs don't
# sneak into the nupkg), packs Abstractions + Core + every discovered
# country package, wipes the NuGet caches those packages live in,
# and runs `dotnet restore --force --no-cache` in the API host.
#
# Country package discovery:
#   every sibling dir matching digitalmaktab-country-* with a .csproj
#   (one .csproj per project — follows the Afghan package convention)
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

# Discover country packages. Each has a single .csproj at its root
# (sibling convention — see Afghan package). An empty match means no
# country packages are checked out, which is a valid shape too.
COUNTRY_DIRS=()
for dir in "$PROJECTS"/digitalmaktab-country-*; do
  [ -d "$dir" ] || continue
  shopt -s nullglob
  csprojs=("$dir"/*.csproj)
  shopt -u nullglob
  [ ${#csprojs[@]} -gt 0 ] && COUNTRY_DIRS+=("$dir")
done

for country_dir in "${COUNTRY_DIRS[@]}"; do
  name="$(basename "$country_dir")"
  echo "==> Cleaning + building + packing $name"
  (cd "$country_dir" && dotnet clean -c Release >/dev/null \
    && dotnet build -c Release >/dev/null \
    && dotnet pack -c Release --no-build -o "$NUGET_LOCAL" >/dev/null)
done

echo "==> Clearing NuGet caches for Core.Abstractions + Core + each country package"
rm -rf \
  "$HOME/.nuget/packages/digitalmaktab.core" \
  "$HOME/.nuget/packages/digitalmaktab.core.abstractions"
for country_dir in "${COUNTRY_DIRS[@]}"; do
  # Discover the package id from the .csproj (PackageId element, or
  # fall back to AssemblyName / directory-last-segment matching the
  # Afghan convention of 'DigitalMaktab.Country.<Name>').
  shopt -s nullglob
  csprojs=("$country_dir"/*.csproj)
  shopt -u nullglob
  for cs in "${csprojs[@]}"; do
    pkg_id="$(sed -nE 's|.*<PackageId>([^<]+)</PackageId>.*|\1|p' "$cs" | head -1)"
    [ -z "$pkg_id" ] && pkg_id="$(basename "$cs" .csproj)"
    pkg_lower="$(echo "$pkg_id" | tr '[:upper:]' '[:lower:]')"
    rm -rf "$HOME/.nuget/packages/$pkg_lower"
  done
done
dotnet nuget locals http-cache --clear >/dev/null

echo "==> Restoring API (force, no cache)"
(cd "$API_DIR" && dotnet restore --force --no-cache >/dev/null)

echo "==> Building API"
(cd "$API_DIR" && dotnet build >/dev/null)

echo "==> Done. Restart 'dotnet run' in digitalmaktab-api to pick up the swap."
if [ ${#COUNTRY_DIRS[@]} -gt 0 ]; then
  echo "    Country packages included: $(printf '%s ' "${COUNTRY_DIRS[@]##*/}")"
fi
