#!/usr/bin/env bash
# Run country-owned migrations and school-year behavior against an isolated, socket-only database.
set -euo pipefail
projects_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
database_dir="$(mktemp -d "${TMPDIR:-/private/tmp}/digitalmaktab-af-academic.XXXXXX")"
initdb -D "$database_dir/data" --auth=trust --username=academic_test > "$database_dir/init.log"
cleanup() { pg_ctl -D "$database_dir/data" -m fast -w stop >> "$database_dir/server.log" 2>&1 || true; }
trap cleanup EXIT
pg_ctl -D "$database_dir/data" -o "-h '' -k '$database_dir' -p 55439" -l "$database_dir/server.log" -w start
createdb -h "$database_dir" -p 55439 -U academic_test academic_year_tests
createdb -h "$database_dir" -p 55439 -U academic_test ministry_report_tests
createdb -h "$database_dir" -p 55439 -U academic_test transfer_tests
createdb -h "$database_dir" -p 55439 -U academic_test fee_reminder_tests
createdb -h "$database_dir" -p 55439 -U academic_test automation_completion_tests
export AF_AUTOMATION_TEST_DATABASE="Host=$database_dir;Port=55439;Username=academic_test;Database=automation_completion_tests"
export AF_FEE_TEST_DATABASE="Host=$database_dir;Port=55439;Username=academic_test;Database=fee_reminder_tests"
export AF_TRANSFER_TEST_DATABASE="Host=$database_dir;Port=55439;Username=academic_test;Database=transfer_tests"
export AF_MINISTRY_TEST_DATABASE="Host=$database_dir;Port=55439;Username=academic_test;Database=ministry_report_tests"
export AF_ACADEMIC_TEST_DATABASE="Host=$database_dir;Port=55439;Username=academic_test;Database=academic_year_tests"
cd "$projects_dir/digitalmaktab-country-afghanistan"
dotnet test tests/DigitalMaktab.Country.Afghanistan.Tests --no-restore --filter 'FullyQualifiedName~AutomationCompletionTests|FullyQualifiedName~FeeReminderTests|FullyQualifiedName~AcademicYearTests|FullyQualifiedName~AcademicYearPolicyTests|FullyQualifiedName~MinistryReportTests|FullyQualifiedName~MinistryRecordTests|FullyQualifiedName~StudentRegisterTests|FullyQualifiedName~PersonDetailsTests|FullyQualifiedName~TransferTests|FullyQualifiedName~SolarHijriCalendarProviderTests|FullyQualifiedName~SwaggerTests' --verbosity minimal
