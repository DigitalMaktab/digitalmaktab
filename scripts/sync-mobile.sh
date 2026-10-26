#!/usr/bin/env bash
# Rebuild installed mobile package artifacts without restarting Metro or devices.
# Consumers must already have their normal npm dependencies installed.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS="$(cd "$ROOT/.." && pwd)"
FEED="$PROJECTS/.npm-local"
mkdir -p "$FEED"
CONSUMERS=("$PROJECTS/digitalmaktab-mobile-parent" "$PROJECTS/digitalmaktab-mobile-student")
MODULES=()
for dir in "$PROJECTS"/digitalmaktab-mobile-country-* "$PROJECTS"/digitalmaktab-mobile-school-*; do
  [ -f "$dir/package.json" ] || continue
  MODULES+=("$dir")
done

pack_and_swap() {
  local source="$1" name version archive consumer staging
  shift
  name="$(cd "$source" && node -p "require('./package.json').name")"
  version="$(cd "$source" && node -p "require('./package.json').version")"
  archive="$FEED/$(echo "${name#@}" | tr '/' '-')-$version.tgz"
  echo "==> Building and packing $name"
  (cd "$source" && npm run build && npm pack --pack-destination "$FEED" >/dev/null)
  for consumer in "$@"; do
    [ -f "$consumer/package.json" ] || continue
    # Only swap declared consumers, never introduce a new dependency silently.
    node - "$consumer/package.json" "$name" <<'NODE' || continue
const pkg = require(process.argv[2]), name = process.argv[3];
process.exit(pkg.dependencies?.[name] || pkg.devDependencies?.[name] ? 0 : 1);
NODE
    staging="$(mktemp -d)"
    tar -xzf "$archive" -C "$staging"
    mkdir -p "$consumer/node_modules/$(dirname "$name")"
    rm -rf "$consumer/node_modules/$name"
    mv "$staging/package" "$consumer/node_modules/$name"
    rmdir "$staging"
    find "$consumer/node_modules/$name" -exec touch {} +
    # Same-version local tarballs change content. Keep npm ci's integrity aligned
    # with the exact artifact installed above without resolving/upgrading peers.
    node - "$consumer" "$name" "$archive" <<'NODE'
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const [consumer, name, archive] = process.argv.slice(2);
const file = path.join(consumer, 'package-lock.json');
if (!fs.existsSync(file)) throw new Error('Run npm install first: ' + consumer);
const lock = JSON.parse(fs.readFileSync(file, 'utf8'));
const entry = lock.packages?.['node_modules/' + name];
if (!entry || !entry.resolved?.startsWith('file:')) throw new Error('Expected locked local tarball: ' + name);
const target = path.resolve(consumer, entry.resolved.slice(5));
if (target !== path.resolve(archive)) throw new Error('Local artifact path mismatch: ' + name);
entry.integrity = 'sha512-' + crypto.createHash('sha512').update(fs.readFileSync(archive)).digest('base64');
fs.writeFileSync(file, JSON.stringify(lock, null, 2) + '\n');
NODE
  done
}
pack_and_swap "$PROJECTS/digitalmaktab-mobile-sdk" "${MODULES[@]}" "${CONSUMERS[@]}"
pack_and_swap "$PROJECTS/digitalmaktab-mobile-core" "${MODULES[@]}" "${CONSUMERS[@]}"
for dir in "${MODULES[@]}"; do pack_and_swap "$dir" "${CONSUMERS[@]}"; done
echo "==> Mobile packages installed. Restart Metro to load the new artifacts."
