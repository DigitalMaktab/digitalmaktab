#!/usr/bin/env bash
# sync-spa.sh — replay the CLAUDE.md pack+swap ritual for the SPA
# packages. Builds spa-core + every discovered country package, packs
# each into .npm-local, swaps the fresh tarballs into the shell's
# node_modules and into each country package's node_modules (so the
# country package resolves spa-core locally too), and clears CRA's
# webpack cache so the next request rebuilds from the swap.
#
# Country package discovery:
#   every sibling dir matching digitalmaktab-spa-country-* with a
#   package.json (follows the Afghan package convention)
#
# Usage: ./scripts/sync-spa.sh
# After this runs you still need to restart `npm start` in
# digitalmaktab-spa so CRA re-reads node_modules.
#
# Exit on first failure so a half-swap doesn't silently land.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"
NPM_LOCAL="$PROJECTS/.npm-local"
CORE_DIR="$PROJECTS/digitalmaktab-spa-core"
SPA_DIR="$PROJECTS/digitalmaktab-spa"

mkdir -p "$NPM_LOCAL"

swap_package() {
  # swap_package <tarball_path> <target_node_modules_dir>
  local tarball target staging
  tarball="$1"
  target="$2"
  staging="$(mktemp -d)"

  rm -rf "$target"
  mkdir -p "$(dirname "$target")"
  tar -xzf "$tarball" -C "$staging"
  mv "$staging/package" "$target"
  rm -rf "$staging"
  # Bump every extracted file's mtime to NOW. npm pack writes
  # deterministic epoch-ish timestamps (Oct 26 1985 by default), so
  # webpack's mtime-based invalidation sees the swap as OLDER than
  # anything it already cached and happily keeps serving the stale
  # module. Previously this forced the user to Ctrl+C + restart
  # `npm start` after every sync — the touch sidesteps that.
  find "$target" -exec touch {} +
}

# Resolves the tarball name npm pack would emit for a given package
# directory: "<name>-<version>.tgz" with the leading @scope/ stripped
# from name (npm pack strips the slash and replaces @ with nothing).
tarball_for() {
  local dir="$1"
  local name version
  name="$(cd "$dir" && node -p "require('./package.json').name" 2>/dev/null)"
  version="$(cd "$dir" && node -p "require('./package.json').version" 2>/dev/null)"
  # @digitalmaktab/spa-core → digitalmaktab-spa-core
  echo "${name#@}" | tr '/' '-' | awk -v v="$version" '{print $0"-"v".tgz"}'
}

SDK_DIR="$PROJECTS/digitalmaktab-spa-sdk"
echo "==> Building + packing SPA SDK"
(cd "$SDK_DIR" && npm run build >/dev/null && npm pack --pack-destination "$NPM_LOCAL" >/dev/null)
SDK_TGZ="$NPM_LOCAL/$(tarball_for "$SDK_DIR")"
for consumer in "$CORE_DIR" "$SPA_DIR" "$PROJECTS"/digitalmaktab-spa-country-* "$PROJECTS"/digitalmaktab-spa-school-*; do
  [ -f "$consumer/package.json" ] || continue
  swap_package "$SDK_TGZ" "$consumer/node_modules/@digitalmaktab/spa-sdk"
done

echo "==> Building spa-core"
(cd "$CORE_DIR" && npm run build >/dev/null)
echo "==> Packing spa-core"
(cd "$CORE_DIR" && npm pack --pack-destination "$NPM_LOCAL" >/dev/null)
CORE_TGZ="$NPM_LOCAL/$(tarball_for "$CORE_DIR")"

# Discover country packages.
COUNTRY_DIRS=()
for dir in "$PROJECTS"/digitalmaktab-spa-country-* "$PROJECTS"/digitalmaktab-spa-school-*; do
  [ -d "$dir" ] || continue
  [ -f "$dir/package.json" ] && COUNTRY_DIRS+=("$dir")
done

# Country packages need spa-core resolvable at build time — swap the
# fresh spa-core into each country package's node_modules before we
# build + pack them.
for country_dir in "${COUNTRY_DIRS[@]}"; do
  name="$(basename "$country_dir")"
  echo "==> Swapping spa-core into $name node_modules"
  swap_package "$CORE_TGZ" \
    "$country_dir/node_modules/@digitalmaktab/spa-core"
done

# Build + pack each country package.
COUNTRY_TGZS=()
for country_dir in "${COUNTRY_DIRS[@]}"; do
  name="$(basename "$country_dir")"
  echo "==> Building $name"
  (cd "$country_dir" && npm run build >/dev/null)
  echo "==> Packing $name"
  (cd "$country_dir" && npm pack --pack-destination "$NPM_LOCAL" >/dev/null)
  COUNTRY_TGZS+=("$NPM_LOCAL/$(tarball_for "$country_dir")")
done

echo "==> Swapping spa-core into SPA node_modules"
swap_package "$CORE_TGZ" \
  "$SPA_DIR/node_modules/@digitalmaktab/spa-core"

# Swap each country package into the shell. Target dir is the npm
# package name under node_modules (@scope/pkg → node_modules/@scope/
# pkg) — same resolution the shell's import statements use.
for i in "${!COUNTRY_DIRS[@]}"; do
  country_dir="${COUNTRY_DIRS[$i]}"
  country_tgz="${COUNTRY_TGZS[$i]}"
  pkg_name="$(cd "$country_dir" && node -p "require('./package.json').name")"
  echo "==> Swapping $pkg_name into SPA node_modules"
  swap_package "$country_tgz" \
    "$SPA_DIR/node_modules/$pkg_name"
done

echo "==> Clearing CRA webpack cache"
rm -rf "$SPA_DIR/node_modules/.cache"

echo "==> Done. CRA will re-bundle automatically (mtimes bumped above);"
echo "    hard-refresh the browser if it serves a cached chunk."
if [ ${#COUNTRY_DIRS[@]} -gt 0 ]; then
  echo "    Country/school packages included: $(printf '%s ' "${COUNTRY_DIRS[@]##*/}")"
fi
