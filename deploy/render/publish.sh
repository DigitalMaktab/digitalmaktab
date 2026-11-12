#!/usr/bin/env bash
# Publishes Digital Maktab to Render (service "digitalmaktab").
#
#   deploy/render/publish.sh               push committed HEADs, pin them, deploy, wait for health
#   deploy/render/publish.sh --setup-keys  (re)create read-only GitHub deploy keys + Render secret file
#   deploy/render/publish.sh --no-wait     deploy without waiting for the result
#
# Only COMMITTED work is published: each repo's HEAD is pushed to origin/main
# and pinned in versions.env; uncommitted changes stay local. Needs `gh` login
# and RENDER_API_KEY (read from ~/.config/digitalmaktab/render.env).
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
MONO="$(cd "$HERE/../.." && pwd)"
PROJECTS="$(cd "$MONO/.." && pwd)"
CONF="${DIGITALMAKTAB_DEPLOY_CONF:-$HOME/.config/digitalmaktab}"
ORG=DigitalMaktab
SERVICE_NAME=digitalmaktab
REPOS=(
  digitalmaktab-core
  digitalmaktab-country-afghanistan
  digitalmaktab-api
  digitalmaktab-spa-sdk
  digitalmaktab-spa-core
  digitalmaktab-spa-country-afghanistan
  digitalmaktab-spa-country-austria
  digitalmaktab-spa
)

[ -f "$CONF/render.env" ] && . "$CONF/render.env"
: "${RENDER_API_KEY:?set RENDER_API_KEY or create $CONF/render.env}"
API=https://api.render.com/v1
render() { curl -fsS -H "Authorization: Bearer $RENDER_API_KEY" -H 'Content-Type: application/json' "$@"; }

service_id() {
  render "$API/services?name=$SERVICE_NAME&limit=20" | jq -r --arg n "$SERVICE_NAME" '.[].service | select(.name==$n) | .id' | head -1
}

ensure_remote() {
  local repo="$1" dir="$PROJECTS/$1"
  if ! git -C "$dir" remote get-url origin >/dev/null 2>&1; then
    echo "==> Creating private GitHub repo $ORG/$repo"
    gh repo view "$ORG/$repo" >/dev/null 2>&1 || gh repo create "$ORG/$repo" --private >/dev/null
    git -C "$dir" remote add origin "https://github.com/$ORG/$repo.git"
  fi
}

setup_keys() {
  local sid="$1" tmp out="$CONF/deploy_keys"
  tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' RETURN
  umask 077; : > "$out"
  for repo in "${REPOS[@]}"; do
    ensure_remote "$repo"
    ssh-keygen -q -t ed25519 -N '' -C "render-build@$repo" -f "$tmp/$repo"
    # Replace any previous render-build key on this repo.
    for id in $(gh api "repos/$ORG/$repo/keys" --jq '.[] | select(.title=="render-build") | .id'); do
      gh api -X DELETE "repos/$ORG/$repo/keys/$id" >/dev/null
    done
    gh api "repos/$ORG/$repo/keys" -f title=render-build -f key="$(cat "$tmp/$repo.pub")" -F read_only=true >/dev/null
    printf '%s %s\n' "$repo" "$(base64 < "$tmp/$repo" | tr -d '\n')" >> "$out"
    echo "==> deploy key registered for $repo (read-only)"
  done
  jq -n --rawfile c "$out" '{content: $c}' | render -X PUT "$API/services/$sid/secret-files/deploy_keys" -d @- >/dev/null
  echo "==> Render secret file deploy_keys updated"
}

SID="$(service_id)"
[ -n "$SID" ] || { echo "Render service '$SERVICE_NAME' not found" >&2; exit 1; }

if [ "${1:-}" = "--setup-keys" ]; then setup_keys "$SID"; exit 0; fi

echo "==> Pushing committed HEADs"
: > "$HERE/versions.env.tmp"
for repo in "${REPOS[@]}"; do
  dir="$PROJECTS/$repo"
  [ "$(git -C "$dir" rev-parse --abbrev-ref HEAD)" = main ] || { echo "$repo is not on main" >&2; exit 1; }
  ensure_remote "$repo"
  git -C "$dir" push -q origin HEAD:main
  sha="$(git -C "$dir" rev-parse HEAD)"
  dirty="$(git -C "$dir" status --porcelain | wc -l | tr -d ' ')"
  note=""; [ "$dirty" != 0 ] && note=" ($dirty uncommitted file(s) NOT deployed)"
  echo "    $repo ${sha:0:12}$note"
  printf '%s %s\n' "$repo" "$sha" >> "$HERE/versions.env.tmp"
done
mv "$HERE/versions.env.tmp" "$HERE/versions.env"

git -C "$MONO" add deploy/render Dockerfile
if ! git -C "$MONO" diff --cached --quiet; then
  git -C "$MONO" commit -q -m "Pin the sibling repo commits deployed to Render

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
fi
git -C "$MONO" push -q origin HEAD:main
COMMIT="$(git -C "$MONO" rev-parse HEAD)"

echo "==> Triggering Render deploy of $SERVICE_NAME @ ${COMMIT:0:12}"
DEPLOY="$(jq -n --arg c "$COMMIT" '{commitId: $c, clearCache: "do_not_clear"}' \
  | render -X POST "$API/services/$SID/deploys" -d @- | jq -r .id)"
echo "    deploy $DEPLOY"
[ "${1:-}" = "--no-wait" ] && exit 0

while :; do
  status="$(render "$API/services/$SID/deploys/$DEPLOY" | jq -r .status)"
  case "$status" in
    live) break ;;
    build_failed|update_failed|canceled|pre_deploy_failed|deactivated)
      echo "Deploy $DEPLOY ended with status $status — see the Render dashboard logs." >&2; exit 1 ;;
  esac
  printf '    %s %s\n' "$(date +%H:%M:%S)" "$status"; sleep 30
done
URL="$(render "$API/services/$SID" | jq -r .serviceDetails.url)"
echo "==> Live: $URL"
curl -fsS -m 30 "$URL/health/ready" >/dev/null && echo "    /health/ready OK" || { echo "    /health/ready FAILED" >&2; exit 1; }
