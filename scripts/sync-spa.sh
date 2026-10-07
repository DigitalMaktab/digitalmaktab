#!/usr/bin/env bash
# sync-spa.sh — replay the CLAUDE.md pack+swap ritual for the SPA
# packages. Builds spa-core and -spa-country-afghanistan, packs each
# into .npm-local, swaps the fresh tarballs into the shell's
# node_modules and into the country package's node_modules (so the
# country package resolves spa-core locally too), and clears CRA's
# webpack cache so the next request rebuilds from the swap.
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
COUNTRY_DIR="$PROJECTS/digitalmaktab-spa-country-afghanistan"
SPA_DIR="$PROJECTS/digitalmaktab-spa"

mkdir -p "$NPM_LOCAL"

swap_package() {
  # swap_package <tarball_glob> <target_node_modules_dir>
  local tarball target staging
  tarball="$1"
  target="$2"
  staging="$(mktemp -d)"

  rm -rf "$target"
  mkdir -p "$(dirname "$target")"
  tar -xzf "$tarball" -C "$staging"
  mv "$staging/package" "$target"
  rm -rf "$staging"
}

echo "==> Building spa-core"
(cd "$CORE_DIR" && npm run build >/dev/null)
echo "==> Packing spa-core"
(cd "$CORE_DIR" && npm pack --pack-destination "$NPM_LOCAL" >/dev/null)
CORE_TGZ="$NPM_LOCAL/digitalmaktab-spa-core-0.1.0-alpha.tgz"

echo "==> Swapping spa-core into country package node_modules"
swap_package "$CORE_TGZ" \
  "$COUNTRY_DIR/node_modules/@digitalmaktab/spa-core"

echo "==> Building spa-country-afghanistan"
(cd "$COUNTRY_DIR" && npm run build >/dev/null)
echo "==> Packing spa-country-afghanistan"
(cd "$COUNTRY_DIR" && npm pack --pack-destination "$NPM_LOCAL" >/dev/null)
COUNTRY_TGZ="$NPM_LOCAL/digitalmaktab-spa-country-afghanistan-0.1.0-alpha.tgz"

echo "==> Swapping spa-core into SPA node_modules"
swap_package "$CORE_TGZ" \
  "$SPA_DIR/node_modules/@digitalmaktab/spa-core"

echo "==> Swapping spa-country-afghanistan into SPA node_modules"
swap_package "$COUNTRY_TGZ" \
  "$SPA_DIR/node_modules/@digitalmaktab/spa-country-afghanistan"

echo "==> Clearing CRA webpack cache"
rm -rf "$SPA_DIR/node_modules/.cache"

echo "==> Done. Restart 'npm start' in digitalmaktab-spa to pick up the swap."
