#!/usr/bin/env bash
# Run Austria's migrations and grade details through Core's grade writer on an isolated, socket-only database.
set -euo pipefail
projects_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
database_dir="$(mktemp -d "${TMPDIR:-/private/tmp}/digitalmaktab-at.XXXXXX")"
. "$(dirname "${BASH_SOURCE[0]}")/isolated-postgres-cleanup.sh"
initdb -D "$database_dir/data" --auth=trust --username=austria_test > "$database_dir/init.log"
pg_ctl -D "$database_dir/data" -o "-h '' -k '$database_dir' -p 55441" -l "$database_dir/server.log" -w start
createdb -h "$database_dir" -p 55441 -U austria_test austria_grade_tests
export AT_GRADE_TEST_DATABASE="Host=$database_dir;Port=55441;Username=austria_test;Database=austria_grade_tests;Pooling=false"
cd "$projects_dir/digitalmaktab-country-austria"
dotnet test tests/DigitalMaktab.Country.Austria.Tests --verbosity minimal
