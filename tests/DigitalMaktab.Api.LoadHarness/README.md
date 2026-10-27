# Actual API mixed-workload verification

From `digitalmaktab`, after the normal `scripts/sync-dotnet.sh` package installation:

```bash
bash scripts/tests/run-full-api-load.sh > /tmp/dm-full-api-load.log 2>&1
# Optional pressure duration, from 1 to 60 seconds (default 10):
bash scripts/tests/run-full-api-load.sh --seconds 30
```

Requires .NET 8, PostgreSQL tools (`initdb`, `pg_ctl`, `createdb`) on PATH and Python 3.
The shell owns a new socket-only disposable PostgreSQL cluster. The driver owns two
API child processes on random loopback ports, and later a replacement for one killed
process. It never stops/restarts the user's API/SPA or connects to their database.
Cleanup terminates only recorded child handles and stops only its private cluster.
Failure preserves bounded host/PostgreSQL diagnostics in printed temporary paths.

The console executable references the actual API project/package graph and invokes
its entry point, preserving the API application name and using its actual runtimeconfig
(including GC settings) rather than console-wrapper defaults. A fail-closed host-building diagnostic hook replaces only outbound
mail with a local accepting implementation. Controllers, module composition, JWT
login/validation, policy provider, middleware, request admission, PostgreSQL rate
limiting, repositories, mapping, durable receipts, background workers, readiness and
key-ring validation are the real application. The current push/SMS/payment providers
are the API's existing no-op implementations. No messages or real payments are sent.
The hook is verification code in this root project; the API does not reference or
publish the harness. No test branch, authentication bypass or provider is added to
production startup. Missing hook installation or non-private DB/key/listener settings
fail before the host starts serving.

Child environments allow only tool paths and generated fixture settings. They use
LoadVerification rather than Development, so no developer `.env` or demo-account
seed is read. Actual appsettings is copied to a private content root, with private
connections/listeners/key storage and explicit fixture quotas. The key directory is
private and uses the explicit unencrypted-storage allowance for this disposable test;
production certificate/storage requirements are unchanged. Report bodies, passwords,
JWTs, SQL credentials and key XML never enter the benchmark report.

Schema bootstrap uses the current real Core/country model and the production
expression-index migrations. It records current Core migration history before
starting the API; actual startup coordination, forward repair and Afghanistan schema
startup then run. This avoids replaying destructive legacy schema transitions just
to create workload data. It is not a fresh-install/legacy migration-chain test;
those migration cases remain in the isolated Core/country suites.

The fixture contains four schools (two AT, two AF), 1,600 students/enrollments,
40 full classes capped at 40, 1,600 fees and 8,000 attendance marks. It uses existing
model fields, country calendar providers and school academic-year plans. Creator/
updater metadata exercises actual scoped audit-label reads. Twelve client workers
combine ordinary student/dashboard/fee/attendance reads, concurrent registration,
payment and attendance intents, plus reports, workbook templates and backup exports.
Documented 503 rejections retain the same intent for explicit recovery; no blind
mutation retry or silent edit rebase is introduced. Rate-limited reads honor hints.

After pressure, the driver checks cross-process replay, competing profile versions,
real template -> filled XLSX -> multipart import -> replay, and complete own-school
student ZIP exports. Foreign student/profile-report reads must be 404. It then holds
an actual fee row in a separate PostgreSQL transaction, observes a financial request
waiting on that row in host A, kills only host A, releases the row and recovers that
same intent on B. A fresh A process must replay it and all earlier accepted intents.
DB assertions check balances, payment counts, class generation/capacity, enrollment
uniqueness, attendance in the school's civil-day bounds, persisted edits and country
profile ownership. The test does not infer success from HTTP acknowledgements alone.

`RuntimeProbe` subscribes to existing production Meter instruments. It bounds stored
series to 256 and exports only route/method/status/reason tags. Periodic samples and
client latency/status/byte summaries are included with measured assembly versions/
SHA256 and driver hashes. A killed process's final sample can retain an active count;
never sum stale active gauges across dead/replacement processes as a current total.
This is a verifier/export consumer, not a production monitoring collector/dashboard.

[baseline.json](baseline.json) is a measured local run. Its settings include 64/16
request permits per host/school, 2/1 expensive permits, pool size 24 per API host and
shared per-IP/per-endpoint quotas of 500/second and 10,000/minute. They are fixture
settings, not deployment recommendations or supported user counts. Budget database
connections/background jobs across all real replicas, preserve the production shared
key ring, and deploy updated policy code to all workers. Configured named role
policies now compile before requests; policy configuration changes require restart.
Dynamic staff capabilities remain live through existing database/JWT checks.

The initial actual-host run found the lazily mutated AuthorizationOptions dictionary
corrupting under concurrent policy reads. Core 8a7bc38 compiles the existing catalogue
at singleton construction and leaves request lookups read-only. The separate Core
regression exercises 10,000 parallel lookups and policy precedence/snapshot behavior.

This is a short, synthetic local TCP workload with no reverse proxy/TLS, browser,
real providers, photos/large binaries, native clients, long soak, production traffic
mix or supported-capacity/SLA claim. Imports, profile races and explicit recovery are
also checked after the pressure window. Classroom cross-host state is still unsupported.
Other endpoint/reference/editor audits, large-output bounds, remaining side-effect
jobs and production telemetry/deployment verification remain part of the broader goal.


The bounded-backup follow-up is recorded separately in
[backup-baseline.json](backup-baseline.json), preserving the original authorization
baseline. The same workload additionally verifies ZIP no-store/content type/known
length, complete format-2 manifest and AF/AT module activation. It accepts the
backup endpoint's localized bounded-export 503 codes with Retry-After: 5 as well
as the existing shared admission response; other failures still fail the run.
Eight successful ZIP responses cover pressure and post-import completeness. This
small fixture does not establish large-archive heap/disk/slow-client limits or
cross-host nightly ownership. Core backup tests cover rejection, cancellation,
expiry and failed-copy preservation separately. Driver/source and installed
assembly hashes in each report identify the exact verifier/package generation.

The current bootstrap also applies MessageReadIndexes before marking the Core
model checkpoint, so its migration-owned normalized message-path index is present
alongside the model's read/unread date indexes. Historical reports retain their
original source/package hashes; do not describe them as new runs of this bootstrap.
MessageQueryPlanTests separately capture actual cleanup/helper plans on 60,001
messages and exercise real index migration/recovery behavior in a guarded database.
