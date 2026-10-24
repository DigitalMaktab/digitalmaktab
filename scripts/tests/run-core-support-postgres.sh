#!/usr/bin/env bash
set -euo pipefail
projects_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
database_dir="$(mktemp -d "${TMPDIR:-/private/tmp}/digitalmaktab-core-support.XXXXXX")"
. "$(dirname "${BASH_SOURCE[0]}")/isolated-postgres-cleanup.sh"
initdb -D "$database_dir/data" --auth=trust --username=support_test > "$database_dir/init.log"
pg_ctl -D "$database_dir/data" -o "-h '' -k '$database_dir' -p 55439" -l "$database_dir/server.log" -w start
createdb -h "$database_dir" -p 55439 -U support_test attendance_write_tests
export CORE_ATTENDANCE_WRITES_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=attendance_write_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test grade_revision_migration_tests
export CORE_GRADE_REVISION_MIGRATION_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=grade_revision_migration_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test grade_write_tests
export CORE_GRADE_WRITES_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=grade_write_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test class_access_tests
export CORE_CLASS_ACCESS_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=class_access_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test shared_throttle_tests
export CORE_SHARED_THROTTLE_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=shared_throttle_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test password_reset_tests
export CORE_PASSWORD_RESET_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=password_reset_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test password_reset_migration_tests
export CORE_PASSWORD_RESET_MIGRATION_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=password_reset_migration_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test push_binding_tests
export CORE_PUSH_BINDING_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=push_binding_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test push_binding_migration_tests
export CORE_PUSH_BINDING_MIGRATION_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=push_binding_migration_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test notification_backplane_tests
export CORE_NOTIFICATION_BACKPLANE_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=notification_backplane_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test realtime_stamp_tests
export CORE_REALTIME_STAMP_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=realtime_stamp_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test session_tests
export CORE_SESSION_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=session_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test session_migration_tests
export CORE_SESSION_MIGRATION_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=session_migration_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test notification_scope_migration_tests
export CORE_NOTIFICATION_SCOPE_MIGRATION_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=notification_scope_migration_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test notification_scope_tests
export CORE_NOTIFICATION_SCOPE_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=notification_scope_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test notification_transport_tests
export CORE_NOTIFICATION_TRANSPORT_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=notification_transport_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test recurring_query_tests
export CORE_RECURRING_QUERY_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=recurring_query_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test academic_recurring_tests
export CORE_ACADEMIC_RECURRING_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=academic_recurring_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test recurring_tests
export CORE_RECURRING_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=recurring_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test inventory_tests
export CORE_INVENTORY_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=inventory_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test inventory_migration_tests
export CORE_INVENTORY_MIGRATION_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=inventory_migration_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test fee_rollover_tests
export CORE_FEE_ROLLOVER_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=fee_rollover_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test fee_sweep_tests
export CORE_FEE_SWEEP_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=fee_sweep_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test startup_seed_tests
export CORE_STARTUP_SEED_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=startup_seed_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test startup_tests
export CORE_STARTUP_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=startup_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test actor_names_tests
export CORE_ACTOR_NAMES_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=actor_names_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test profile_tests
export CORE_PROFILE_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=profile_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test profile_migration_tests
export CORE_PROFILE_MIGRATION_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=profile_migration_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test registration_tests
export CORE_REGISTRATION_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=registration_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test registration_migration_tests
export CORE_REGISTRATION_MIGRATION_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=registration_migration_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test reporting_tests
export CORE_REPORTING_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=reporting_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test payment_tests
export CORE_PAYMENT_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=payment_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test payment_migration_tests
export CORE_PAYMENT_MIGRATION_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=payment_migration_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test runtime_tests
export CORE_RUNTIME_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=runtime_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test support_tests
createdb -h "$database_dir" -p 55439 -U support_test student_write_tests
createdb -h "$database_dir" -p 55439 -U support_test authentication_tests
createdb -h "$database_dir" -p 55439 -U support_test access_tests
createdb -h "$database_dir" -p 55439 -U support_test ai_tests
createdb -h "$database_dir" -p 55439 -U support_test automation_tests
createdb -h "$database_dir" -p 55439 -U support_test teaching_migration_tests
export CORE_TEACHING_MIGRATION_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=teaching_migration_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test capacity_tests
export CORE_CAPACITY_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=capacity_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test capacity_migration_tests
export CORE_CAPACITY_MIGRATION_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=capacity_migration_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test teaching_tests
export CORE_TEACHING_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=teaching_tests;Pooling=false"
createdb -h "$database_dir" -p 55439 -U support_test timetable_tests
export CORE_TIMETABLE_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=timetable_tests;Pooling=false"
export CORE_AUTOMATION_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=automation_tests;Pooling=false"
export CORE_AI_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=ai_tests;Pooling=false"
export CORE_ACCESS_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=access_tests;Pooling=false"
export CORE_AUTH_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=authentication_tests;Pooling=false"
export CORE_STUDENT_WRITE_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=student_write_tests;Pooling=false"
export CORE_SUPPORT_TEST_DATABASE="Host=$database_dir;Port=55439;Username=support_test;Database=support_tests;Pooling=false"
export CORE_BACKPLANE_REDIS_EXECUTABLE="$(command -v redis-server)"
cd "$projects_dir/digitalmaktab-core"
dotnet test tests/DigitalMaktab.Core.Tests --verbosity minimal "$@"
