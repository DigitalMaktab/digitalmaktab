#!/usr/bin/env bash
# Builds the production Digital Maktab bundle from a workspace of sibling repo
# checkouts (the same layout as ~/Desktop/projects): the .NET Core + country
# packages are packed into a private local feed, the API is published, the SPA
# packages are packed into a local npm folder, and the SPA shell is built into
# the API's wwwroot so one service serves both (same origin, like before).
#
# Usage: build.sh <workspace-with-clones> <output-dir>
# Runs inside the Render Docker build (see ../../Dockerfile) and can be run
# locally against fresh clones for verification (see publish.sh --verify).
set -euo pipefail

W="$(cd "$1" && pwd)"
OUT="$2"
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"
NUGET_LOCAL="$W/.nuget-local"
NPM_LOCAL="$W/.npm-local"
mkdir -p "$NUGET_LOCAL" "$NPM_LOCAL"

# The repos list GitHub Packages as a source; it needs auth and holds stale
# same-version packages, so builds use only nuget.org + the freshly packed feed.
NUGET_CONFIG="$W/NuGet.config"
cat > "$NUGET_CONFIG" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <clear />
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" protocolVersion="3" />
    <add key="local" value="$NUGET_LOCAL" />
  </packageSources>
</configuration>
EOF
for repo in digitalmaktab-core digitalmaktab-country-afghanistan digitalmaktab-api; do
  cp "$NUGET_CONFIG" "$W/$repo/NuGet.config"
done
# Private package cache so a stale same-version DigitalMaktab.* never leaks in.
export NUGET_PACKAGES="$W/.nuget-packages"
export DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1

echo "==> Packing Core.Abstractions, Core, SDK"
for proj in DigitalMaktab.Core.Abstractions DigitalMaktab.Core DigitalMaktab.SDK; do
  dotnet pack "$W/digitalmaktab-core/src/$proj/$proj.csproj" -c Release -o "$NUGET_LOCAL" -p:IncludeSymbols=false
done

echo "==> Packing country modules"
for dir in "$W"/digitalmaktab-country-*; do
  [ -d "$dir" ] || continue
  dotnet pack "$dir"/*.csproj -c Release -o "$NUGET_LOCAL" -p:IncludeSymbols=false
done

echo "==> Publishing API"
dotnet publish "$W/digitalmaktab-api/DigitalMaktab.Api.csproj" -c Release -o "$OUT/api"
# Core's Seeder reads Data/Seed/*.json relative to the working directory, and
# NuGet does not carry those files into the host's output.
mkdir -p "$OUT/api/Data/Seed"
cp "$W"/digitalmaktab-core/src/DigitalMaktab.Core/Data/Seed/*.json "$OUT/api/Data/Seed/"

echo "==> Publishing fresh-database bootstrap"
cp "$NUGET_CONFIG" "$(dirname "$0")/bootstrap/NuGet.config"
dotnet publish "$(dirname "$0")/bootstrap/DigitalMaktab.Deploy.Bootstrap.csproj" -c Release -o "$OUT/bootstrap"
rm -f "$(dirname "$0")/bootstrap/NuGet.config"

# Render's build machine has little memory: stop the MSBuild/Roslyn servers the
# .NET steps left running before webpack starts (together they were OOM-killed).
dotnet build-server shutdown >/dev/null 2>&1 || true

# --- SPA -------------------------------------------------------------------
# Keep webpack's heap bounded so it collects garbage instead of being OOM-killed.
export NODE_OPTIONS="--max-old-space-size=${SPA_BUILD_HEAP_MB:-1536}"
# Local tarballs are rebuilt here, so their lockfile integrity hashes from the
# developer machine cannot match. Drop only those file: tarball hashes.
strip_local_integrity() {
  node -e '
    const fs = require("fs"); const f = process.argv[1];
    const lock = JSON.parse(fs.readFileSync(f, "utf8"));
    for (const [k, v] of Object.entries(lock.packages || {})) {
      if (k.includes("@digitalmaktab/") && typeof v.resolved === "string" && v.resolved.startsWith("file:")) delete v.integrity;
    }
    fs.writeFileSync(f, JSON.stringify(lock, null, 2));
  ' "$1/package-lock.json"
}
npm_install() {
  strip_local_integrity "$1"
  (cd "$1" && npm ci --legacy-peer-deps --no-audit --no-fund --loglevel=error)
}
pack_npm() { (cd "$1" && npm run build && npm pack --pack-destination "$NPM_LOCAL" >/dev/null); }

export CI=false  # CRA treats lint warnings as errors when CI=true
echo "==> SPA SDK";  npm_install "$W/digitalmaktab-spa-sdk";  pack_npm "$W/digitalmaktab-spa-sdk"
echo "==> spa-core"; npm_install "$W/digitalmaktab-spa-core"; pack_npm "$W/digitalmaktab-spa-core"
for dir in "$W"/digitalmaktab-spa-country-* "$W"/digitalmaktab-spa-school-*; do
  [ -f "$dir/package.json" ] || continue
  echo "==> $(basename "$dir")"; npm_install "$dir"; pack_npm "$dir"
done

echo "==> SPA shell"
npm_install "$W/digitalmaktab-spa"
(cd "$W/digitalmaktab-spa" && GENERATE_SOURCEMAP=false npm run build)
mkdir -p "$OUT/api/wwwroot"
cp -R "$W/digitalmaktab-spa/build/." "$OUT/api/wwwroot/"
echo "==> Bundle ready in $OUT/api"
