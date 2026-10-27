#!/usr/bin/env bash
set -euo pipefail
projects_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
database_dir="$(mktemp -d "${TMPDIR:-/private/tmp}/digitalmaktab-core-support.XXXXXX")"
chmod 700 "$database_dir"
. "$(dirname "${BASH_SOURCE[0]}")/isolated-postgres-cleanup.sh"
initdb -D "$database_dir/data" --auth=trust --username=support_test > "$database_dir/init.log"
pg_ctl -D "$database_dir/data" -o "-h '' -k '$database_dir' -p 55439 -c max_locks_per_transaction=512" -l "$database_dir/server.log" -w start
createdb -h "$database_dir" -p 55439 -U support_test full_app_load_tests
export DM_LOAD_ROOT="$database_dir"
export DM_LOAD_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=full_app_load_tests;Pooling=true;Maximum Pool Size=24"
dotnet build "$projects_dir/digitalmaktab/tests/DigitalMaktab.Api.LoadHarness" --verbosity quiet
python3 "$(dirname "${BASH_SOURCE[0]}")/full-api-load.py" "$projects_dir/digitalmaktab-api" "$@"
