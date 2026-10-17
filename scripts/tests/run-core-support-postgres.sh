#!/usr/bin/env bash
set -euo pipefail
projects_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
database_dir="$(mktemp -d "${TMPDIR:-/private/tmp}/digitalmaktab-core-support.XXXXXX")"
initdb -D "$database_dir/data" --auth=trust --username=support_test > "$database_dir/init.log"
cleanup() { pg_ctl -D "$database_dir/data" -m fast -w stop >> "$database_dir/server.log" 2>&1 || true; }
trap cleanup EXIT
pg_ctl -D "$database_dir/data" -o "-h '' -k '$database_dir' -p 55439" -l "$database_dir/server.log" -w start
createdb -h "$database_dir" -p 55439 -U support_test support_tests
export CORE_SUPPORT_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=support_tests"
cd "$projects_dir/digitalmaktab-core"
dotnet test tests/DigitalMaktab.Core.Tests --verbosity minimal
