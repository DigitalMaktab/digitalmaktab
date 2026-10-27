# Concurrency and performance implementation

Navigation/workspace tabs are parked. This work implements the seven areas agreed on 2026-10-22 across shared Core and its consumers; country modules reuse the shared protection.

## Completion requirements

- [ ] Concurrent-edit protection across record editors: expected versions, atomic Core/module updates, localized conflicts, retain entered values and explicit comparison/reload.
- [ ] Durable duplicate-submission protection for important writes, scoped by tenant/actor/action with payload fingerprints and replay; test retries and concurrent requests (especially payments and registration).
- [ ] Audit database uniqueness/invariants and transaction boundaries: capacity, enrollment, attendance, grades, fees/payments, inventory, bookings and module writes; preserve existing history and permission checks.
- [ ] Query/index audit for student/teacher lists, lookup/search, attendance and dashboards. Verify plans and timings against representative data; no unbounded includes, unstable paging or tenant-crossing caches.
- [ ] Bound expensive imports, reports and exports; request cancellation, bounded queues/concurrency, resource limits, fair tenant limits, useful overload responses, preserve ordinary request capacity.
- [ ] Multiple API instances: coordinated/deduplicated background work; shared rate-limit state; SignalR routing and classroom state; persistent shared Data Protection keys; verify cross-instance behavior and failure recovery.
- [ ] Observability, database/readiness checks and reproducible isolated multi-school load tests covering registrations, edits, attendance, dashboards, imports/exports; record latency/error/throughput and deployment constraints without inventing a supported user count.

## Implementation evidence

Keep this section current with tests, measured results, remaining gaps and package installation status. A passing focused test does not establish completion of an unchecked area.

### Person edit versions (student/teacher Core profiles; parent/self-service expansion below)

Student and Teacher reuse their existing tables with an opaque `Revision` concurrency token. Reads expose the revision; profile updates must echo it. Missing versions fail with 428, stale versions with 409, both localized. Core and country extension saves share one transaction. Owned address/phone changes also advance the version. All callers must ship alongside this API contract; old clients must reload/update rather than silently overwrite newer data.

### Request admission and runtime probes

Shared `RequestCapacity` limits active work per process (defaults: 64 API requests, 16 per school, 2 expensive globally and 1 expensive per school). Admission happens before authentication so DB-backed token validation is bounded. A second gate uses validated tenant claims after authorization. There is no waiting queue and no automatic mutation retry. Overload returns localized `503`, `code=server_busy`, `Retry-After: 2` and `Cache-Control: no-store`.

Core explicitly marks student/teacher/parent/attendance/grade imports, fee generation, newsletter generation, backup export and server PDF generation with `ExpensiveOperation`. Additional expensive country endpoints and client-driven multi-page exports remain in the audit. These are concurrency budgets **per process**, not distributed rate limits or a claim about supported production traffic. Configure `RequestCapacity__*` per deployment, keeping room in the PostgreSQL connection budget for background jobs and probes across all replicas.

The host uses request-scoped localization and no longer changes process-wide culture defaults on each request. `/health/live` checks the running HTTP process independently of the DB. `/health/ready` does a real SELECT 1 with a three-second cancellation bound and returns only framework health status, without connection/exception details. Restrict probe access at the reverse proxy. Database schema compatibility is still established by migrations/startup, not this connectivity probe.

Core emits `DigitalMaktab.Runtime` Meter instruments: active requests, rejected admissions (bounded reason tag), and duration in seconds (route template/method/status tags). No student identifiers, school IDs, raw URLs or queries enter metric labels. Collection/export and dashboards remain part of the monitoring work.

### First query improvements and evidence

Student/teacher lists use no tracking, split collection queries and deterministic LastName/FirstName/Id paging. Both receive school/name/ID composite indexes. Common SaveAll and these list queries honor request cancellation. The narrow person migration backfills distinct nonzero versions without changing identity/data, and is tested up/down.

On an isolated, warm local PostgreSQL fixture of 20,000 student rows in two schools, the page-ID/name query changed from a sequential scan + sort (2.815 ms) to an index-only scan (0.038 ms). Teacher index-only query: 0.025 ms. This is evidence for that lookup/index only, not an end-to-end response or production capacity measurement. Full entity includes, large offsets, substring search and dashboard aggregation remain to be measured.

### Validation so far (2026-10-22)

- Core isolated PostgreSQL suite: profile races, missing versions, owned-value races, module rollback, migration preservation/index plans, overload/fairness/release and DB readiness. 116 passed, none skipped (`/tmp/dm-runtime-final-tests.log`).
- Afghanistan regression suite: 103 passed, none skipped after the first package swap.
- `node scripts/tests/person-concurrency.cjs`: shared Formik/request-hook values and version retained after 409/428/503, all three languages, no automatic retries.
- Shell TypeScript check and strict locale parity passed after package swap.
- Shared backend/SPA packages rebuilt and installed locally; dev servers were left running under user control. Restart API/SPA to pick up package changes and apply the additive migration.
- Larger seven-area objective remains open, especially financial writes/idempotency, other record editors, distributed coordination/state, extensive query auditing and reproducible whole-app load testing.

References used: [EF optimistic concurrency](https://learn.microsoft.com/en-us/ef/core/saving/concurrency), [ASP.NET request limiting](https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit?view=aspnetcore-8.0), [Npgsql connection budgets/timeouts](https://www.npgsql.org/doc/connection-string-parameters).

### Financial mutations and durable replay (second implementation increment)

Core now owns `MutationReceiptStore`, reused by `FeePaymentService` rather than country-specific payment paths. Receipt scope is school + immutable actor ID + role + operation + request UUID. A PostgreSQL transaction advisory lock serializes the same retry across hosts. The SHA-256 fingerprint rejects changing a completed operation's input. Financial effects, audit writes, recipient-preference-aware inbox rows and the encrypted response commit in one transaction. No external transport runs before that commit and replay never runs the mutation delegate again. Receipt payloads are excluded from audit snapshots and school backups. Preserve the shared Data Protection key ring; losing replay keys must never cause the operation to execute again.

The payment, bulk payment, void, waiver proposal and waiver decision endpoints require a UUID `Idempotency-Key` header (428 if missing). Success replay remains available after a host restart and after a payment is voided. Same key/different details returns localized 409. These receipt records are not ephemeral cache entries and must not be pruned in a way that enables old financial requests to run again. Key/header integration is complete in the current SPA payment and waiver forms. Core's shared `useMutationIntent` holds one ID and original payment timestamp through errors, and starts a new intent when the user explicitly opens another operation. It is scoped to the current login and does not implement the parked navigation/draft feature or persist unfinished forms across reloads.

All ledger writes lock the actual fee row and reload tracked values before checking the current balance. Bulk operations lock fees in a stable UUID order, allocate in the user's requested order, accept at most 100 unique fees, and commit or roll back as one operation. Roster-created fees use the existing generation period lock and roll back with a rejected payment. Concurrent waiver proposals/decisions share the same fee lock. Voids preserve the payment row using existing Status/UpdateUserId/UpdateDate, reverse its balance once, and exclude voided payments from current payment lists, receipts and collected-income aggregates. Fiscal backups retain the history. The additive migration adds a unique receipt scope and a positive-payment check that protects new writes without deleting or rewriting legacy financial anomalies.

Webhook JSON is buffered before model binding for exact signed-body verification, bounded to 64 KiB, bound to the configured provider identity, and deduplicated by provider/session using durable receipts. Same-session changed amounts/fee metadata are rejected. The shared secret comparison uses constant-time hash comparison. Checkout now checks student/parent ownership in addition to school scope, and takes currency from the school's country. Payment request bodies are bounded to 128 KiB. Manual payment timestamps must be UTC. No payment provider was provisioned or activated.

Regression testing uncovered an earlier version-tracker bug when EF replaces an owned reference: its old Deleted entry shares a key with the new Added entry. The principal lookup now excludes deleted entries; a Core address-replacement test and Afghanistan national-ID replacement regression cover it.

Evidence:

- `PaymentConcurrencyTests`: real independent Kestrel API hosts, PostgreSQL, real audit/notification persistence and a shared filesystem key ring. Covers twelve concurrent identical payments, distinct conflicting payments, opposite-order bulk locks, injected second-payment rollback, roster rollback, void races/history/replay, wrong-school/role rejection, waiver races, signed webhook races and changed-payload rejection, restart replay, checkout ownership/currency, migration up/down and legacy preservation, and note validation matching the form.
- Core final full suite: 119 passed, zero skipped (`/tmp/dm-payment-release-tests.log`); focused payment tests: 3 passed (`/tmp/dm-payment-final-races.log`).
- Afghanistan suite after owned-reference fix: 103 passed, zero skipped (`/tmp/dm-payment-af-tests.log`).
- Real SPA payment/waiver forms in English/Dari/Pashto retain entries and reuse the request ID/timestamp on rejected submissions; subsequent explicit operations get a different ID (`scripts/tests/payment-intents.cjs`). The test uses actual Core forms/intent/API serialization, with a small table/transport test harness; database behavior is independently covered above.
- Full export/filter/form audit: 104 table sites passed (`/tmp/dm-payment-ui-audit.log`), including the new mutation tests. Shell TypeScript and strict translation parity passed.

Remaining full-goal work includes registration and other important mutation receipts, remaining versioned editors and explicit conflict comparison, the wider invariant/query audit, cross-instance background/rate-limit/classroom state coordination, telemetry export, and representative whole-application load testing. The financial read audit identified a Gregorian/off-by-one expected-month bug; the third increment below corrects the month/year/timezone calculation.

Transaction/locking references: [PostgreSQL row and advisory locking](https://www.postgresql.org/docs/17/explicit-locking.html), [EF transactions](https://learn.microsoft.com/en-us/ef/core/saving/transactions).

- Second increment package status: final Core/SDK/country packages rebuilt and installed in the API (`/tmp/dm-payment-release-sync.log`), SPA packages rebuilt/installed (`/tmp/dm-payment-final-sync.log`). No user-owned API/SPA server was restarted. Local implementation commits: Core `923bfd0`, SPA Core `f6de619`, SPA shell `d9285db8`, API `7d77a28`, Afghanistan test fixtures `181deac`; nothing pushed.


### Dashboard and financial read snapshots (third implementation increment)

Core financial health now aggregates balances, payment totals and overdue parents in PostgreSQL instead of materializing full fee/student/parent graphs. Parent rankings have deterministic ties and are limited to 50; the query explicitly restricts parent school ownership. Aging materializes only year/month aggregates. Configured school-year reads use six SQL statements and no tracked entities. School overview uses two statements instead of nine: scalar counts in one statement and active, distinct, selected-year enrollments per class in the second. Overall student/teacher/class totals retain the existing all-record semantics. School overview, financial health and fee reports use repeatable-read snapshots, request cancellation and no-store responses; a concurrent payment cannot leave different fields from different committed states in one response.

Core reuses the selected school's calendar provider and academic-year timezone. Expected fees use the selected academic year and the actual current native month, including academic years spanning September through August; stale selected years do not become current simply because their month ordinal matches. Collected income uses half-open school-local month boundaries and active payment rows, including payments settling older invoices. Historical aging uses each academic year's anchor, not the server's current Gregorian year. SchoolLocalTime supplies date boundaries shared with attendance automation, covering ambiguous midnights, DST gaps and skipped dates. Afghanistan retains its Solar Hijri provider; a Kabul/Sawr integration fixture verifies local-midnight inclusion/exclusion and Dari month labels.

Fee reports also aggregate in PostgreSQL. Class attribution reuses retained enrollment history for the fee's school/year, then a joining-class fallback restricted to that same school/year. A student transfer cannot expose another school's class ID or branch name. Missing legacy history stays explicitly unassigned; totals still reconcile. Class groups expose stable nullable class IDs and localized labels including section numbers. Fee has no immutable assessment-time class snapshot; this report uses the existing placement history rather than claiming to reconstruct an invoice-time class. Server-generated timestamps remain attached to the actual successful snapshot.

SPA Core owns useReloadableRead, reused by all three screens. One request is active per mounted resource, unmount/scope changes cancel it, and late responses cannot cross accounts or languages. Refresh failures retain the last same-scope snapshot and show translated errors/manual retry; 401/403/404 clear it. Rerenders do not trigger repeated requests. No automatic mutation retries or parked navigation/draft behavior was introduced. New report strings ship in English/Dari/Pashto and the mobile country translation package.

Evidence for this increment:

- ReportingTests: real PostgreSQL + Kestrel routes; snapshot consistency with a real payment committed between report queries; selected-year/current-month logic; timezone boundaries; tenant guards, transferred students and unassigned legacy class totals; cancellation/no tracking/no-store; empty and stale-year cases. DST/date-line theories cover Havana, Sao Paulo and Apia. Focused run: four passed, none skipped (`/tmp/dm-reporting-tenant-final.log`).
- Warm isolated fixture: 2,000 distinct students with twelve monthly fees each, 24,005 fees total. Previous graph path: 1,113.2 ms / 132,134,520 allocated bytes; aggregate path: 17.5 ms / 158,800 bytes, six SQL reads. EXPLAIN (ANALYZE, BUFFERS) for each query is emitted in the same log. This compares query paths locally; it establishes no whole-application latency or supported concurrent-user count. No new index or schema migration was needed for this increment.
- Real shared hook and report screen tests are in scripts/tests/report-reads.cjs: single-flight reads, explicit retry, canceled/late responses, account/language scopes, authorization failures, retained figures and no-store transport in all three locales. School dashboard integration tests cover the shared hook and localized refetch.

The full seven-area goal remains open. In particular, class report groups and overview chart output still scale with the school's class count; they are not yet a fixed-size/paged reporting contract. Remaining work includes registration and other durable mutation receipts, other versioned editors and conflict comparison, lookup/search/attendance and invariant audits, country/client export limits, cross-instance jobs/rate-limits/classroom state, telemetry export, and whole-application load tests. Do not infer completion of any checklist area from this increment.

- Integrated validation after the final tenant/history fix: Core 123 passed / zero skipped (`/tmp/dm-reporting-complete-core.log`); Afghanistan 103 passed / zero skipped (`/tmp/dm-reporting-integrated-af.log`). Shell TypeScript, strict locale parity and mobile coverage passed. Shared Core/backend/country and SPA packages rebuilt/installed (`/tmp/dm-reporting-integrated-sync.log`); installed parent/student mobile translation bundles match source. No user server was restarted.
- Full shared export/filter/form audit passed at all 104 AppTable sites, including the new read lifecycle tests (`/tmp/dm-reporting-integrated-ui.log`).


### Account registration receipts and welcome delivery (fourth implementation increment)

Core AccountRegistrationService reuses MutationReceiptStore for student, teacher and parent creation. Their POSTs require a UUID Idempotency-Key and bound bodies to 128 KiB. Core BaseController now shares durable-header/no-store/localized-problem handling with financial mutations. Receipt scope remains school + immutable actor + role + operation + UUID; payload fingerprints reject changing a completed intent. Normalized-email advisory locks also serialize separate registration intents for the same email across hosts/schools. Existing email/role policy is preserved. These locks cover these three endpoints; imports/staff onboarding/other account writers still require the wider uniqueness audit.

The account, country hooks, student enrollment/overflow section/first fee, welcome-delivery intent and encrypted original result commit in one transaction. A failed country hook rolls them all back. A retry recovers the same account ID, class assignment and generated password without repeating creation. The current school year is captured on first execution; a later school-year change cannot change the fingerprint of an otherwise identical retry. Replays return the original result, including the original temporary password and queued-at-creation status; they do not reset a password changed later. Account credentials are generated using the shared cryptographically secure generator. No external email runs before commit or blocks the registration response.

AccountWelcomeDelivery is a private Core queue with encrypted recipient/password/language payloads. It is excluded from audits and school backup exports. The narrow additive migration creates only that table and its due-work partial index; generated unrelated legacy/model drift was explicitly removed. Only this queue's metadata was added to the existing snapshot. No country table/column or historical registration data is dropped by this migration.

AccountWelcomeQueue claims one due row in a short PostgreSQL FOR UPDATE SKIP LOCKED transaction. A two-minute lease and token-fenced acknowledgement coordinate independent workers; no DB transaction spans the provider request. Each process sends sequentially, waits one second between work items and ten seconds when idle, and records a heartbeat. Transport uses the existing welcome templates and an HttpClientFactory-managed client; both the provider request and dispatcher have a 30-second cancellation bound. The request's language is preserved. Display names and welcome template substitutions are HTML-escaped; transport logs omit exception bodies and credentials. Workers check that the account still belongs to the active school, is active, retains the recipient address and still matches the queued password at dispatch time. This cannot retract a message already sent while a later reset occurs.

Failures back off exponentially from 30 seconds (one-hour cap); eight attempts or one-day expiry terminate delivery. Terminal rows scrub the encrypted payload. Process shutdown/crash leaves a reclaimable lease. Fencing prevents a late worker from clearing another worker's lease/payload. Provider acceptance and DB acknowledgement are separate external effects: a crash between them can repeat the same welcome email. This is at-least-once delivery, not an invented guarantee of exactly-once email arrival. Account/placement/fee creation remains transactionally protected independently.

Student/teacher/parent SPA editors send a stable Core useMutationIntent key through transient failures and retain their entries. A fresh editor gets a fresh intent. The shared password reveal control displays queued delivery distinctly from accepted email, with English/Dari/Pashto translations mirrored to mobile. The API and clients must be deployed together for the required-header contract. Existing imports retain their current direct-mail behavior; their bounded/idempotent workflow is still part of the full goal.

Evidence:

- RegistrationConcurrencyTests run two independent real Kestrel hosts against PostgreSQL and a shared filesystem Data Protection key ring: twelve simultaneous identical submissions, restart replay and changed active-year context, changed payload/actor/role rejection, one placement/overflow section/fee/receipt/queue row, rollback/retry after a failing extension, concurrent parent links and teacher creation, encrypted private fields and backup/audit exclusion.
- Queue tests cover competing workers, real transaction release during transport, expired-lease recovery, delayed retry, failed/expired/reset credentials, terminal secret scrubbing, preserved Dari language and late lease fencing. A fake HTTP handler exercises the actual SendGrid transport's cancellation/HTML encoding without contacting any provider. Migration up/down preserves an unrelated legacy table and rejects destructive Up operations.
- scripts/tests/registration-intents.cjs renders the actual three registration editors, Core forms, operation hooks and API serialization in English/Dari/Pashto: pending duplicate suppression, retained entered values, identical request IDs through repeated failures, original-password recovery, queued-delivery text and fresh IDs on new editor operations. It is included in the full shared export/filter/form gate.

The original seven-area completion checklist remains open. Other important writes/imports/staff onboarding, remaining edit/version/conflict flows and invariant/query audits, cross-instance coordination for the older jobs/rate limits/classroom state, shared persistent production key configuration, telemetry export and representative whole-app capacity tests remain required. Multi-host tests share a key ring; that is not evidence that a production deployment has configured one. Existing mapper profiles still initialize from process-wide ServiceLocator; this fixture is isolated from unrelated test teardown while keeping its own HTTP/database races concurrent. That legacy initialization pattern also remains in the audit.

Implementation references: [PostgreSQL queue locking](https://www.postgresql.org/docs/current/sql-select.html), [ASP.NET Data Protection configuration](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/configuration/overview?view=aspnetcore-8.0).

- Fourth-increment final validation: Core 126 passed / zero skipped (`/tmp/dm-registration-verified-core.log`); Afghanistan 103 passed / zero skipped against rebuilt packages (`/tmp/dm-registration-verified-af.log`). Full 104-table export/filter/form audit passed (`/tmp/dm-registration-full-ui.log`); final parent error-detail/retry path passed the focused real-editor tests (`/tmp/dm-registration-final-ui.log`). Shell TypeScript, strict translation parity and mobile coverage passed. Backend packages/API rebuilt and installed (`/tmp/dm-registration-verified-dotnet.log`), SPA packages installed (`/tmp/dm-registration-final-sync.log`), mobile package rebuilt and swapped into both existing consumers. User-owned API/SPA servers were not restarted.

- Final client retry audit found token renewal was resetting useMutationIntent. It now uses immutable actor/role/school identity through a shared Core account-identity resolver (also reused by useMyId), retaining the same request ID/timestamp across token renewal and replacing it for account/school changes. Real-editor identity assertions and payment regression tests passed (`/tmp/dm-registration-stable-ui.log`, `/tmp/dm-registration-stable-payment-ui.log`); Core TypeScript passed. Forms remain memory-only and unmount normally on logout; no parked draft/navigation behavior was added.


### Parent/self-service versions and shared conflict review (fifth implementation increment)

Parent now reuses Core IRevisionedRecord and the existing aggregate revision tracker; no separate country version mechanism was introduced. The narrow migration adds a nullable UUID, backfills distinct nonzero versions, then makes it required. Its down path removes only that column. Existing parent identities, names and relationships are preserved. Parent admin/self-service and teacher self-service profile updates now require the read Revision: missing/empty versions return localized 428, stale versions and write races return localized 409. DTOs never assign the stored revision. Parent address/phone edits share the parent update and EF's version predicate; parent admin and self-service use the same save path. Self-service reads/writes also check school ownership. Profile detail responses and comparison reads use no-store and cancellation. Temporary parent-update logs containing names and original/changed field values were removed.

Core BaseController owns the shared version-problem contract. Non-GET actions with an otherwise unhandled DbUpdateConcurrencyException become localized 409 responses before the response starts; there is no automatic retry or attempt to rewrite an already-started stream. Specialized controller strings take precedence; Core's shared RecordConcurrencyMessages supplies a translated infrastructure fallback. This prevents old photo/password/link write paths that actually race on a protected aggregate from becoming generic 500s, but does not pretend those flows all have explicit client preconditions/idempotency yet.

SPA Core AppRecordConflictReview is reused by student, teacher and parent admin editors and teacher/parent self-service profiles. Rejected submissions keep their values and source revision. Review is an explicit, cancellable, single-flight read; failures show a translated retry action without replacing entries. Read responses missing a usable revision cannot be applied. Selected profile fields are displayed side by side through Core cards/text formatting; private credentials/audit/module payloads are excluded from the field list. Reference values retain available DTO values. Date-only comparisons reuse AppCalendarDate with UTC and the active country's calendar, including Afghanistan's provider. Keep my entries leaves the draft/version unchanged; Load saved values is an explicit modal confirmation that replaces the form snapshot/version together and never submits it. The user saves again manually. Core useApiRequests retains structured problem status/code for this flow, without changing ResponseResult semantics for existing callers.

AppBaseEditor and useFormData support an explicit whole-snapshot replacement so Formik reinitialization cannot restore an old baseline after review. Teacher editor hydration now uses its fetched record rather than an unrelated initial fallback; initial student/teacher/parent edit forms wait for their requested record and support cancellation/retry. Formik owns self-service gender and revision instead of a separate select state. Self-service reload also refreshes hidden address/country metadata used by the narrow update DTO, preserving postal code/district/type fields. A late profile response cannot restore an unmounted/changed account, and a same-account token refresh is retained when merging a successful profile result.

Core AppFormSubmitButton centralizes Formik's pending/disabled state and existing translated Saving label, reused by AppFormCard and self-service profile forms. AppModal coordinates nested Escape/Tab ownership and scroll locking, including initially mounted nested dialogs. Conflict actions use its fixed footer so long reviews keep buttons accessible. New review messages ship in English/Dari/Pashto and are mirrored into the mobile country package. Existing mobile parent/student profiles are read-only; the source audit found no mobile profile PUT caller requiring a new payload contract.

Evidence:

- ProfileConcurrencyTests: independent real Kestrel hosts and PostgreSQL; forced simultaneous parent admin/self-service and teacher self-service UPDATEs, one winner/one 409, missing/empty versions, translated stale errors, school isolation, no-store, owned-only independent-context races, and a real MVC fallback exception. Migration up/down preserves legacy names and backfills distinct versions. Tests use the real validators, repositories, mapper profiles and localized resources.
- Full Core suite: 128 passed, zero skipped (`/tmp/dm-profile-full-core.log`). Afghanistan suite against rebuilt Core packages: 103 passed, zero skipped (`/tmp/dm-profile-country-tests.log`).
- scripts/tests/profile-conflicts.cjs runs the actual five editor surfaces with Core forms/hooks/API serialization in all three languages: stale drafts, delayed/canceled/failed latest reads, explicit retry, no automatic save, value/version replacement, narrow-profile metadata preservation, token renewal and late unmounted responses. The same run verifies nested keyboard focus/Escape, footer placement and scroll restoration. A New York timezone run uses the real Afghanistan calendar adapter and verifies date-only comparisons (`/tmp/dm-profile-native-ui.log`).
- Full 104-table shared export/filter/form audit passed (`/tmp/dm-profile-full-ui.log`), including the new profile flow; the existing profile-save regression passed (`/tmp/dm-profile-save-ui.log`). Core/shell TypeScript and strict locale parity passed. Backend/country packages were rebuilt/installed (`/tmp/dm-profile-release-sync.log`), then final SPA changes rebuilt/installed (`/tmp/dm-profile-final-spa-sync.log`). No user-owned API/SPA server was restarted.

The entire seven-area goal remains open: other record editors and country-module write contracts, explicit preconditions/idempotency for additional actions/imports, broader attendance/grade/inventory/booking invariants, query/lookup/search/actor-name mapping audits, expensive-output limits, cross-instance jobs/rate limits/classroom state/key configuration, telemetry export and representative whole-app load testing. Do not turn the top-level completion boxes green based on person-editor tests.

- Final fifth-increment packaging: latest Core suite 128/128 passed after the response-start guard (`/tmp/dm-profile-final-core.log`), Core/shell type checks passed, mobile locale package installed and source-verified in both existing consumers, and final .NET packages/API build succeeded (`/tmp/dm-profile-final-dotnet.log`). The API/SPA must be restarted together to pick up the required parent/self-service revision contract and additive parent migration. The broader checklist remains active.


### Audit actor display names (sixth implementation increment)

Core UserResolver now projects only a display name and identity precedence, using one UNION ALL query per uncached actor instead of sequential full-account lookups. It includes existing parent and staff identities. Existing platform user / school / teacher / student precedence is preserved. School-bound requests exclude other schools' accounts and school names; global platform users remain resolvable. Unbound platform/background contexts retain their existing authorized scope.

The bounded (512 entry) positive/negative cache belongs to DataContext, not a transient resolver or process-global dictionary. Its key includes the effective module/request school ID, so switching a tenant binding cannot reuse another school's cached result. Both synchronous and asynchronous SaveChanges paths clear it before writes; a new unit of work starts fresh. Names are snapshots within a read unit of work, rather than a cross-request identity cache. Pre-canceled mappings stop before database work. AutoMapper remains synchronous: this does not claim mid-command async cancellation or a fully batched mapping contract for many distinct actors.

ActorNameMappingTests uses PostgreSQL and the real BaseMapper with transient resolver construction. Mapping a 100-record array with the same creation/update identity issues exactly one scalar query, loads no account entities into the tracker and does not select passwords or owned address columns. It verifies all six identity types, school isolation, tenant-binding changes, negative cache hits, null/empty IDs, refresh after sync/async saves, freshness in another context and pre-cancellation. Full Core validation passed 129 tests, zero skipped (`/tmp/dm-actor-core-full.log`).

This removes repeated reads for shared creators/updaters; distinct actors still require distinct lookup queries. Wider batched lookup/search work, other seven-area requirements, production key/job/SignalR coordination and representative whole-app load tests remain open. No top-level completion box is changed by this increment.

- Sixth-increment packaging and regression: Core/backend/country packages rebuilt and installed, API build succeeded (`/tmp/dm-actor-sync.log`); Afghanistan integration suite passed 103 tests, zero skipped (`/tmp/dm-actor-afghan.log`). No schema or UI contract changed. User-owned servers were not restarted; restart the API to load the rebuilt Core package.


### Coordinated database startup (seventh implementation increment)

Core StartupDatabaseCoordinator serializes PostgreSQL startup initialization across API instances with a stable database-local session advisory lock. API Program now registers it as a command interceptor and passes the same dedicated DataContext through MigrateAsync, existing forward repairs and Seeder.SeedData. No separate seeder scope escapes the lock. The callback finishes before app.Run starts listeners/background services. Core seeding now propagates failure instead of swallowing it; an incompletely seeded instance does not report a successful startup.

Startup disables pooling on its dedicated connection, rejects multiplexing and automatic retry strategies, and holds the same physical connection across migration transactions and seed writes. The interceptor is required and checked before initialization. A closed/broken session is permanently fenced for that context; intercepted EF commands cannot reconnect and continue after losing the lock. The final session check also detects legacy repair callbacks that catch errors. Late EF work is fenced before unlock. Release and close run on success/failure/cancellation, with a bounded release command; the non-pooled session is closed rather than returned carrying an advisory lock. No transaction spans the whole migration/repair/seed sequence; individual migration/seed commit boundaries remain, and completed work is not claimed to roll back as one unit.

Lock acquisition defaults to 120 seconds, configurable via DatabaseStartup:LockWaitSeconds (environment DatabaseStartup__LockWaitSeconds), range greater than zero through 1800 seconds. Waiting uses cancellable polling and runs no initialization callback until ownership is obtained. An exhausted wait fails this instance's startup; it does not serve traffic while skipping schema checks. The supplied startup context is single-use. All startup writes must use it, and future module startup hooks must follow the same rule. Startup connections require a direct/session-affine PostgreSQL path; transaction-pooling database proxies cannot supply session-lock semantics.

StartupDatabaseCoordinatorTests uses independent coordinator objects/real database sessions with a real EF test migration and check-then-insert seed without a unique constraint: the second initializer waits, both subsequently finish, and one seed/migration history entry remains. Other cases verify wait timeout/cancellation never enter the callback, callback failure releases ownership, swallowed disconnect errors still fail startup, PostgreSQL pg_terminate_backend rolls back active transactional work and permits another instance to proceed, and unsupported/missing-interceptor configurations fail before initialization. A separate isolated schema exercises the real Core Seeder: missing configuration stops startup, then competing retries with valid configuration create one root account. No user database or server is used for these tests.

This coordinates cooperating startup instances; it does not make incompatible DDL safe against already-serving older application versions. Production should still apply reviewed migrations through a controlled deployment step and use compatible schema rollout phases. It does not complete multi-instance background job/rate-limit/classroom-state/key coordination or the other top-level areas.

Design references: [EF migration deployment guidance](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/applying), [PostgreSQL session advisory lock semantics](https://www.postgresql.org/docs/17/explicit-locking.html#ADVISORY-LOCKS).

- Seventh-increment final validation: Core 135 passed / zero skipped (`/tmp/dm-startup-core-final.log`); rebuilt package/API build passed (`/tmp/dm-startup-sync.log`); Afghanistan 103 passed / zero skipped against the rebuilt packages (`/tmp/dm-startup-afghan.log`). No new migration or user-facing string was introduced. User-owned API/SPA servers were not restarted. Restart the API to load the coordinator and startup wiring. The seven-area goal remains active.


### Shared persistent Data Protection and real readiness (eighth implementation increment)

Core AddDigitalMaktabDataProtection now owns the existing filesystem key-ring configuration outside School AI. The DigitalMaktab application discriminator remains unchanged; key/revocation files and prior ciphertext are not rewritten or deleted. API startup invokes its readiness validation after database initialization and before app.Run. Existing two-host registration/payment tests now use this shared configuration instead of independently configuring their own key persistence.

Outside Development, KeyRingPath must be absolute and already provisioned on persistent shared storage. KeyRingId is a nonzero UUID matching the .digitalmaktab-key-ring text marker. The marker is never auto-created in production; it detects an absent/empty/wrong replacement directory before a new key ring can be silently accepted. This cannot prove a filesystem is physically shared: actual deployment mounts and all replicas must be verified by operators. The code supports RSA PFX wrapping certificates and a list of previous decryption certificates. Active certificates must be currently valid and contain private RSA keys; old decryption certificates may be expired. Certificate-loading errors omit paths/passwords/provider messages. Linux/Windows use ephemeral imports; macOS uses .NET's temporary-keychain import. DI owns certificate disposal through shared settings tied to key-manager options.

Production requires a wrapping certificate unless AllowUnencryptedKeyStorage explicitly acknowledges external storage protection. Certificate wrapping applies to newly generated key XML, not a fictitious in-place re-encryption of legacy files. Development without a path retains the framework's existing default store. Deployment/backup/restore/overlap rotation instructions live in the API README. No real production directory, certificate, mount or infrastructure was provisioned or replaced; production configuration remains an explicit deployment prerequisite. Retained encrypted mutation receipts may require old decryption material indefinitely.

DataProtectionReadinessHealthCheck verifies the directory marker, actual write/read/delete access and a real protection/unprotection round trip. Missing/empty/wrong storage becomes unhealthy, and restored storage recovers. Probe files are removed; exceptions/secrets are not returned. Async I/O honors cancellation with a three-second cancellation budget. Framework key loading/crypto is synchronous; there is no claim that cancellation forcibly interrupts a stalled OS filesystem operation. The active certificate's expiry is also checked.

The API had both MapHealthChecks and older MapGet handlers for the same health paths. It now uses Core MapDigitalMaktabHealthChecks once: liveness excludes dependencies, readiness selects the tagged database and key-ring checks, anonymous probes remain available, responses are uncached and no raw database exception is returned. Real Kestrel health tests verify 200/503/recovery/no-store against shared path removal, an empty replacement and a wrong marker, plus liveness independence.

SharedDataProtectionTests verifies independently constructed providers, 20 concurrent cold-instance protections, cross-instance read/restart, certificate rotation with overlap, encrypted new key XML, missing-old-certificate failure, purpose/school isolation, byte-preservation/readability of legacy XML, invalid production settings/private keys/passwords/expiry, sanitized failures and health cancellation. The real two-host financial and registration replay suites exercise the centralized configuration against PostgreSQL. Full Core suite passed 140 tests, zero skipped (`/tmp/dm-keys-core-verified.log`).

This supplies a shared-key deployment contract and tested implementation, not evidence that a live production deployment has mounted the configured shared storage or tested disaster recovery. The broader multi-instance job/rate-limit/SignalR/classroom work and the other top-level requirements remain open.

References: [ASP.NET key storage providers](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/implementation/key-storage-providers?view=aspnetcore-8.0), [Data Protection configuration and certificate rotation](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/configuration/overview?view=aspnetcore-8.0), [.NET certificate import platform behavior](https://learn.microsoft.com/en-us/dotnet/standard/security/cross-platform-cryptography#x509-certificates).

- Eighth-increment final integration: shared backend/country packages rebuilt and installed; API build succeeded (`/tmp/dm-keys-sync.log`). Afghanistan suite passed 103 tests, zero skipped against rebuilt Core (`/tmp/dm-keys-afghan.log`). Core remains 140 passed / zero skipped. No user server was restarted. Restart the API to pick up the common key configuration and health routes; non-Development deployment must supply the documented directory/identity/certificate settings. The full seven-area objective remains open.


### Bounded, resumable fee generation and school sweep (ninth implementation increment)

The existing FeeRepository period advisory lock already serialized cooperating automatic/manual generators across hosts. This increment preserves that lock and existing fee/history rows rather than adding a second job/receipt table. GenerateForMonth now streams 250-line chunks, bounds each ID lookup and insertion batch, links an explicit cancellation token with request cancellation, and forwards it to lock acquisition, reads, saves and commit. One repository-owned transaction spans all chunks for atomic manual generation; caller-owned payment/transfer/registration transactions remain intact. Return values count actual new fees rather than SaveChanges totals that also included audits/unrelated pending records. For a repository-owned unit of work, each saved fee batch and its matching fee audit entries are detached; other tracked caller records are not cleared. Caller-owned transactions retain their graphs/lifetime.

MonthlyFeeRollerService now reads only 250 projected candidates at a time, using stable native PostgreSQL UUID range comparison (no OFFSET or CASE comparison) and SQL enrollment existence/fee absence checks. Existing fees, inactive accounts/classes/enrollments and nonpositive monthly amounts are excluded before materialization. DiscountCalc remains the source of scholarship amounts/notes. Automatic pages commit independently: interruption preserves completed pages, and a later sweep fills missing periods. Concurrent candidate reads may overlap, but the existing shared period lock rechecks before inserting. There is no fabricated global exactly-once scheduler guarantee.

The hourly background sweep pages 100 active school IDs, creates/disposes an independent scope for each school, and keeps a bounded failure count rather than retaining every exception/context. A failing school does not skip later schools. Shutdown cancellation propagates without a false failure heartbeat or attempts to process the rest of the school list. Active-year resolution forwards cancellation into existing country/school academic-year provider hooks; CurrentMonthAsync forwards it to calendar lookup, including a pre-canceled cached lookup. The manual rollover action also forwards request cancellation and uses Core's existing expensive-operation admission metadata.

FeeRolloverTests uses isolated PostgreSQL with 3,208 students (1,201 eligible plus other-school/inactive/unenrolled/zero-fee cases), real fees/audits, independent contexts and real locks/transactions. Simultaneous scheduled/manual generation returns a combined 1,201 inserted fees with no duplicate period and correct discount/audit records. It verifies 250-ID/batch bounds, a 500-entry peak including fee audits for fresh units of work, no account/address graph projection, duplicate input/enrollment handling, zero-insert replay, all-chunk manual rollback after a second-chunk FK failure, caller-owned rollback/graph preservation, cancellation while another connection holds the period lock, and 250 committed rows surviving interruption followed by exactly 951 missing-row inserts. A second 102-active-school/one-inactive-school fixture verifies three listing pages, distinct school contexts, continuation after one failure, clean background shutdown, module-hook token forwarding and cached calendar cancellation.

Query plans are collected through EXPLAIN (ANALYZE, BUFFERS) on actual candidate SQL. The local small-data planner can choose existing PK/enrollment indexes or a student scan/hash join according to its estimates; these results do not justify an extra index or a production capacity claim. No index, uniqueness migration, parallel fee table or financial history rewrite is shipped in this increment. Full Core regression passed 142 tests, zero skipped (`/tmp/dm-rollover-core-final.log`).

Remaining scope includes manual controller roster materialization/notification fan-out, durable intent/replay for generation itself, database uniqueness protection for writers outside the cooperating generator, historical duplicate resolution without losing payment history, broad job deduplication/fairness, billing school-timezone/year-boundary semantics, other invariants/query/output audits, distributed state and whole-app load evidence. The seven top-level completion requirements remain open.

- Ninth-increment final evidence: full Core 142 passed / zero skipped (`/tmp/dm-rollover-core-final.log`); actual candidate SQL plans retained in `/tmp/dm-rollover-measured.log` (focused two tests passed; the two initial-page plan executions measured 0.792 ms and 0.710 ms on this warm local 3,208-student fixture, with an empty initial fee table—not whole-rollover latency or production capacity). Backend/country packages rebuilt/installed and API build passed (`/tmp/dm-rollover-sync.log`); Afghanistan 103 passed / zero skipped (`/tmp/dm-rollover-afghan.log`). No schema migration or user server restart occurred. Restart the API to load the rebuilt shared interfaces/services.


### Inventory stock writes, versions and retained history (tenth implementation increment)

InventoryRepository now owns existing Core inventory records and tenant-scoped reads/writes; InventoryController delegates instead of directly mutating its DataContext. No parallel stock ledger was introduced. Creation and movements reuse MutationReceiptStore with school/immutable actor/role/operation/UUID scope and payload fingerprints. They require an Idempotency-Key header and bound JSON bodies to 16 KiB. An opening balance or movement, quantity update, audit rows and encrypted original response commit together. Duplicate/restarted requests return the original result; changed completed payloads conflict. A failed receipt save rolls everything back. Stock mutations lock and reload the current item row before applying a signed decimal delta, preventing identity-map stale quantities and cross-host lost updates/overspending. Nonzero delta/overflow/negative-result checks remain explicit; current stock is the authority for each new movement, rather than an unrelated client snapshot version.

InventoryItem reuses IRevisionedRecord and Core's aggregate version tracker. Metadata PUT and archive DELETE require the last read Revision, with shared translated 428/409 problems. Revisions are never assigned from DTOs. Metadata/delta/archive paths share the same item lock; stale metadata cannot overwrite a changed item. Delete is now an archive, with immutable movements retained. The existing history endpoint can still read an owned archived item's movements; an archive browsing/restore UI is not part of this increment. FK delete behavior is Restrict, so a direct parent delete cannot erase movement history. Core SaveChanges rejects modifying/deleting existing InventoryTransaction objects; accountable corrections use a new movement.

The narrow InventoryStockIntegrity migration adds/backfills distinct revisions, installs nonnegative quantity/threshold and nonzero movement checks as NOT VALID, and changes the existing FK action. It neither deletes history nor recalculates balances. Legacy invalid rows are preserved, not assumed repaired. Negative legacy values produce translated StockNeedsReconciliation conflicts before writes. Positive historical quantity/ledger mismatches also require review; no ordinary compensating movement can repair an already-existing difference because it changes both sides equally. Operator read-only audit SQL and reviewed reconciliation notes are in the API README. Check-constraint validation after legacy reconciliation remains a deployment/administration task. Only inventory snapshot metadata was changed; unrelated model drift was left intact.

InventoryMapper now uses ordinary AutoMapper Base mappings without capturing process-global localizers. AuditInterceptor supports an injected request accessor and both NameIdentifier and legacy id claims, preserving the parameterless constructor/fallback for existing consumers. API DI already supplies the accessor; the inventory HTTP fixture verifies the persisted audit actor. No HttpContext is captured across requests.

SPA Core's inventory API sends required mutation headers and revision payload/query values, and supplies no-store/cancellation for reads. InventoryList uses Core useMutationIntent for creation/movements, keeping entries and request IDs after uncertain responses, with fresh IDs for new deliberate operations and stability through token renewal. It reuses AppRecordConflictReview for explicit cancellable comparisons/reload; rejected drafts retain their original version. Metadata replacement updates the Formik baseline/version together and never auto-saves. Archive remains explicitly confirmed; conflicts require refresh/review before another confirmation. Reads reuse useReloadableRead for single-flight/scope/cancellation/error handling; actor/school changes hide/close old operations, and late writes cannot close/refetch a new account's editor. Numeric controls allow fractional quantities and validate the same lengths as the server.

Core AppFormSubmitButton supplies shared pending behavior. AppModal's optional busy state blocks dismissals and marks aria-busy while an accepted write is pending; focus stays in a dialog with no enabled controls. Existing modal behavior remains the default. Movement badges now use Core theme variants rather than fixed hex colors. New inventory UI/messages ship in English/Dari/Pashto, with UI translations mirrored and installed in both mobile consumers. The mobile source audit found no inventory-write caller needing the new contract.

Evidence:

- InventoryConcurrencyTests: two independent real Kestrel hosts/PostgreSQL/shared key ring; twelve identical creates and movement retries, distinct concurrent receipts/issues, rejected overspending, exact ledger balance, original replay after restart/archive, changed payload/missing key, teacher role and cross-school boundaries, stale/missing versions and concurrent metadata winners, localized conflicts, cached-context reload, receipt-write rollback/retry, real aborted HTTP request waiting on a row lock, archive/movement race, retained history, database quantity/FK rejection and legacy error handling. Migration up/down preserves invalid legacy rows, verifies backfilled versions and snapshot metadata, and enforces new quantity/threshold/delta checks without silently altering history.
- scripts/tests/inventory-concurrency.cjs renders the actual screen/Core forms/API modules in all three languages: pending duplicate/dismiss/focus guards, stable retry keys and token renewal, new intents, retained stale drafts, canceled comparison reads, explicit keep/reload/manual resubmit, revisioned archive confirmation/refresh, fractional native input validity, and account/late-response isolation. It is included in the full 104-table gate.
- Core 144 passed / zero skipped after the audit actor fix (`/tmp/dm-stock-audit-core.log`); full 104-table UI gate passed (`/tmp/dm-stock-ui-full.log`), with final focused numeric/keyboard verification (`/tmp/dm-stock-ui-accessibility.log`). Core/shell TypeScript and strict locale parity passed. Mobile package was rebuilt/installed and its three translation bundles matched source in both existing consumers.

The full goal remains active. Inventory list/history still materialize collections and need the broader paged query/output audit. Global job coordination/rate-limit/SignalR state, remaining record editors and domain invariants, telemetry/export and representative whole-app capacity evidence remain required. Preserved legacy inventory anomalies have not been automatically reconciled, and focused stock tests do not establish those other guarantees.

- Tenth-increment final packaging: latest backend packages/API build passed (`/tmp/dm-stock-verified-dotnet.log`), SPA packages rebuilt/installed after the keyboard guard (`/tmp/dm-stock-verified-spa.log`), Afghanistan 103 passed / zero skipped (`/tmp/dm-stock-country-verified.log`), final 104-table gate passed (`/tmp/dm-stock-ui-verified.log`), and Core/shell type checks plus strict locale/mobile coverage passed. Core remains 144 passed / zero skipped including the injected audit actor. Installed mobile bundles match source. No user server was restarted. Restart API and SPA together to load the required inventory header/version contract and additive inventory migration; remove older API writers during a production rollout as documented in the API README.


- Final inventory read/write race review extended Core useReloadableRead with explicit invalidate(): it aborts an older in-flight read and starts a fresh one after an accepted mutation. Ordinary reload remains single-flight. Held callbacks use the latest scope through token renewal; abandoned/unmounted/superseded reads cannot write state. Inventory uses invalidation after successful writes and after an archive conflict's refresh. Confirmed writes release their form pending state without waiting for the list refresh, so an earlier refresh cannot later clear a newly opened operation's busy state. The real screen test renews a token during a blocked movement, starts an older list read, completes the movement, verifies that read is aborted, observes the new quantity in the current scope, and verifies a late stale response cannot restore the old value. Existing report read lifecycle tests remain covered by the full UI gate. This does not add automatic write retries or polling.

- Final invalidation follow-up validation: Core type check passed (`/tmp/dm-stock-invalidate-core-types.log`); real inventory/report read regression passed; latest SPA packages installed (`/tmp/dm-stock-read-verified-spa.log`); final full 104-table gate and shell type check passed (`/tmp/dm-stock-read-ui-all.log`, `/tmp/dm-stock-read-shell-types.log`). Backend/country evidence remains the unchanged 144/103 passing suites above. No user-owned server was restarted.

### Recurring inbox checkpoints and low-stock sweep (eleventh implementation increment)

Core RecurringSchoolNotifications reuses SchoolAutomationReceipt; no duplicate job/receipt table or schema migration was added. Reserved `system.*` rule keys, school/source advisory transaction locks and unique school/rule/recipient fingerprints coordinate independent workers. Lock acquisition is nonblocking. Each batch owns one transaction, uses PostgreSQL time for its cadence, and commits inbox rows and receipt inserts/updates together before realtime publication. Recipient pages are keyset ordered by UUID/role and limited to 250. A checkpoint survives inbox deletion. Recent matching legacy inbox rows are adopted into checkpoints during rollout, with exact school, type, source, recipient and role matching. This cannot reconstruct legacy notifications deleted before adoption.

SchoolNotificationAudience is shared with configurable school automations. Membership reads use bounded ID arrays and scalar projections, with exact school/account/role/activity and preference pairs. Inventory operators now include the actual School admin identity, active principal/headmaster accounts, and active staff with current active `inventory.write` role grants. Cross-school grants, inactive identities, wrong-role identities and opt-outs are excluded. Each recipient's preferred language falls back to the school's country language, using existing English/Dari/Pashto inventory resource keys; the caller's culture is restored. Configurable automations retain their separate per-candidate capability requirements and now forward calendar lookup cancellation.

Inventory low-stock work catches up at process startup, then hourly. Its three-day cadence is per recipient rather than one inbox row suppressing a whole school's recipients. Source scans use 100-item UUID keyset pages; every recipient page has its own scope/context so tracking stays bounded. A shared inventory row lock rechecks current quantity, threshold and archive state after candidate selection, coordinating with stock writers. Negative legacy balances/thresholds are excluded for reviewed reconciliation. Failures roll back that batch, continue other items, and mark the sweep unsuccessful; cancellation exits cleanly. Existing cadence receipts prevent a restarted/competing process from duplicating committed inbox rows.

Evidence: real isolated PostgreSQL tests cover two independent DI providers/workers; atomic receipt/inbox persistence and failure rollback/retry; publication only after both records are visible; transport failure without duplicate inbox writes; deletion of inbox rows; expired cadence; legacy adoption; recipient language; role/tenant/activity/opt-out boundaries; nonblocking source locks; cancellation waiting on a stock row; replenishment committed after selection while waiting on that row; 260 additional staff across three items; source scans beyond 100 items; archive/disabled thresholds/inactive schools; bounded SQL arrays and a 750-entry tracking ceiling including audit rows. The test harness provisions its own recurring-test database. No test contacts a real messaging provider or writes the user's database.

Limitations remain explicit: publication uses the existing best-effort notification channel, not a durable push/SMS outbox or an exactly-once external delivery guarantee. The legacy provider interface has no cancellation contract; its transport bounds still require the wider notification audit. Inbox/receipt persistence is protected independently of that publication. Other scheduled jobs, rate-limit coordination, SignalR/classroom state, fairness across large tenants, remaining editors/invariants/queries/exports and representative whole-application load evidence are still open. Keep the existing 180-day automation receipt retention; system recurring cadences are restricted to at most 30 days. Do not delete recent checkpoints as if they were inbox rows. Remove older low-stock workers before production cutover because they do not participate in this coordination.

- Eleventh-increment final validation: Core 148 passed / zero skipped, including the >100-source pagination check (`/tmp/dm-recurring-core-final.log`); Afghanistan 103 passed / zero skipped (`/tmp/dm-recurring-afghan.log`); backend Core/country packages rebuilt and installed, API build passed (`/tmp/dm-recurring-sync.log`). Source diffs pass whitespace checks. No frontend contract/translation changes or schema migration were needed. No user server was restarted; restart the API to load the new reminder path. The seven completion areas remain unchecked.

### Shared bounded sweeps for assignment, admission and appeal reminders (twelfth implementation increment)

Core RecurringSchoolNotificationSweep owns the 100-source/250-recipient keyset traversal, fresh recipient scopes, nonblocking source coordination, failure continuation, startup catch-up/hourly scheduling and cancellation/health reporting. IRecurringSchoolNotificationRule keeps SQL eligibility and localized messages with their owning feature. Inventory now reuses that runner; its prior checkpoint/stock safeguards remain covered by the existing tests. This removes duplicated traversal/scheduling without adding domain or checkpoint tables. The existing cancellation-only SendBatch callback overload remains usable; an additional database-time callback supports deadline rules. Cadence time is refreshed after potentially waiting for the domain row. Empty eligible audiences and already-checkpointed pages avoid unnecessary receipt/history reads.

AssignmentDueSoonNotificationRule replaces the unbounded assignment/roster/submission/inbox lists with bounded source pages and a SQL roster/submission anti-join. It keeps the next-36-hour window and per-recipient 24-hour cadence. Source status/deadline is rechecked under a shared Assignment row lock; database clock time is reread after that wait. Active course/class, explicit enrollment class/year and current student school/activity are required; completed submissions remain excluded using the existing submission semantics. No assignment/submission is changed. An enrollment/submission committed after the recipient query is outside that read snapshot; this increment does not claim a new global transaction protocol for submission/roster writers.

Accepted admissions and stale appeals use their existing seven-day grace/weekly recipient cadence. Current admission status, conversion and archive state, or appeal decision and archive state, are rechecked under their row lock before staging. Appeals require owned active grade/course/class provenance; the owning teacher must still be active in the same school. Recipients include the actual school admin, active leaders, and active staff with current admissions.write or gradeAppeals.write grants. SchoolNotificationAudience applies exact identity/role/preferences/language checks. Reminders never approve/convert applicants or decide appeals. Existing controller English/Dari/Pashto resources are reused; no untranslated UI or country-owned logic was introduced into Core.

Evidence: real PostgreSQL tests cover two independent worker providers; a 263-student roster with submitted/opted-out/withdrawn/foreign/stale-enrollment exclusions and localized messages; exact admin/teacher/dynamic-staff recipients; invalid cross-school appeal provenance; converted/rejected/recent/inactive admissions; decided/recent/deleted appeals; inbox deletion/restart; domain rows changed while a worker waits on their lock; an assignment actually expiring during that wait; later-batch receipt failure preserving 250 prior committed inbox rows and the next worker sending exactly ten missing rows; immediate hosted startup catch-up, one successful health heartbeat and cancellation-safe shutdown. Shared tests also retain >100-source paging, stock-race/cadence/replay coverage and bounded arrays/tracking (now using thread-safe peak instrumentation). The isolated harness provisions a separate academic-recurring database; no live user data or real transports are used.

Other recurring jobs, durable external publication, provider cancellation, distributed rate limiting, SignalR/classroom state, tenant fairness, remaining editors/invariants/queries/outputs and whole-app load evidence remain open. The shared runner bounds each unit of work; it does not establish a fair global scheduler or a production capacity number. API rollout notes now cover stopping old workers for all four migrated jobs. The frontend contract is unchanged; the narrow source-query index migration is described below.


The source-query audit found only primary/relationship indexes for these three source tables. A private PostgreSQL fixture seeds 50,000 historical ineligible rows plus one eligible row in each table (150,003 total), executes the actual feature source queries with the active-school gate and 100-row bound, and captures EXPLAIN (ANALYZE, BUFFERS) before/after index installation without disabling sequential scans. RecurringReminderIndexes adds only three nonunique partial indexes: active Assignment(DueDate,Id), active accepted/unconverted Admission(DecidedAt,Id), and active pending GradeAppeal(ProposedAt,Id). Runtime/snapshot metadata matches the migration, and up/down/up preserves every fixture row. No other model drift or historical values are changed.

In the focused warm local fixture, assignment/admission/appeal source execution measured 2.087/3.649/3.159 ms before and 0.030/0.011/0.024 ms after; all three post-index plans use their named reminder indexes instead of filtering through 50,000 irrelevant source rows. Full plans are retained in /tmp/dm-recurring-query-plans.log. These are individual source-query measurements for sparse eligibility in one small tenant graph, not whole-job latency, general load-test results, or a supported production user count. Different eligible/history distributions still need the broader representative query/load audit. Index creation uses normal transactional DDL and can wait for/block writes during installation; schedule the coordinated schema rollout in a controlled maintenance window on large databases.

- Twelfth-increment final verification: full Core 155 passed / zero skipped (`/tmp/dm-academic-reminders-indexed-core.log`); Afghanistan 103 passed / zero skipped (`/tmp/dm-academic-reminders-indexed-afghan.log`); latest Core/country packages rebuilt and installed, API build passed (`/tmp/dm-academic-reminders-indexed-sync.log`). Focused before/after source plans and migration preservation passed (`/tmp/dm-recurring-query-plans.log`). Hosted health opt-in and whitespace checks passed. No user-owned server was restarted and no live user database was modified by tests. Restart the API to load the new paths and additive three-index migration; use the documented controlled production schema rollout. The full seven-area goal remains active and unproven.


### Bounded cancellable notification publication (thirteenth implementation increment)

Core notification/provider/repository write contracts now accept cancellation tokens; existing source callers can omit the optional argument. Actual API DI registers one NotificationDeliveryGate per host and validates configurable limits. Defaults are eight active network operations with no queue, ten seconds per channel, and thirty seconds across a single notification or bulk publication. Push/SMS implementations must use asynchronous IO and honor tokens, without capturing a scoped DataContext. The gate bounds waiting with WaitAsync and retains a slot for an uncooperative outstanding task until it actually completes; its late exception is observed. Repeated ignored-cancellation timeouts therefore cannot create unlimited abandoned IO. Database work is never abandoned into that observer. This is per-process admission, not shared/distributed rate limiting or a circuit breaker.

NotificationService reuses PublishPersisted for sequential fan-out rather than creating one SignalR task per recipient. Channel failures are independent: a failed SignalR send does not prevent push/SMS. A whole-publication deadline stops repeated device/channel/recipient work while leaving the persisted inbox count intact. Explicit caller cancellation propagates; calls without an explicit token inherit the current request abort when available. Recurring school/configurable automation and financial post-commit paths pass their tokens through. Transactional payment staging also forwards cancellation. Committed rows remain independent of network outcome; this is best-effort publication, without an external-delivery outbox or automatic send/mutation retries.

Device reads use untracked 100-row UUID pages and exact school/user/role/activity predicates. SMS uses one role-specific, school-scoped scalar phone query rather than loading phones from multiple person tables by bare UUID. If the shared transport gate is saturated, publication stops before unnecessary device/phone reads. A narrow NotificationDeviceLookupIndex migration adds only the nonunique partial active DeviceToken(UserId,SchoolId,UserRole,Id) lookup index; runtime and snapshot metadata match. Up/down/up preserves every fixture row. No device/account/history records are rewritten. Normal index installation requires the documented controlled schema rollout on large tables.

DigitalMaktab.Notifications Meter exposes active, rejected, timed-out, failed and publication-budget-expired instruments with bounded channel/scope labels. Transport warnings are rate-limited per channel/publication scope and omit exception/provider payloads. No-op push/SMS log counts only, including no phone numbers, tokens, titles or bodies. API documentation specifies validated settings and rebuilding custom transport implementations against the new cancellation signatures. Afghanistan test doubles reuse these Core contracts; no country transport implementation was introduced.

Evidence: unit tests exercise shared DI configuration/singleton capacity, no queue, ignored cancellation retaining its slot until actual completion, late failure observation/recovery, cooperative cancellation, invalid limits and payload-free logs. Real isolated PostgreSQL tests verify inbox visibility before transport, a 205-device recipient yielding 100/100/5 batches while foreign-school/wrong-role/inactive devices are excluded, SMS recipient projection, later channels after SignalR failure, default request-abort forwarding, no canceled pre-write staging, one active send at a time for bulk recipients, whole-fanout deadline leaving all twelve inbox rows readable, cancellation against a real locked device table, and saturation avoiding that blocked query altogether. A further fixture adds 50,000 unrelated device tokens and captures the actual publisher SELECT plan before/after the new index, with migration preservation/metadata checks. No real messaging provider or live user database is contacted.

Remaining scope explicitly includes legacy StageMany recipient materialization/membership policy, per-identity inbox queries/SignalR group namespaces and message events, durable external delivery, other jobs, distributed limits/routing/classroom state, further editors/invariants/queries/outputs and full-application load/telemetry evidence. Transports violating the asynchronous/nonblocking callback contract are not made safe by this gate. Historical notes above about absent provider cancellation are superseded by this increment. All seven completion areas remain open.

- Thirteenth-increment query evidence: the publisher's actual active-recipient device SELECT filtered 50,208 irrelevant rows in the private fixture before indexing (2.949 ms, 966 shared buffer hits); after the partial recipient index it used IX_DeviceToken_ActiveRecipient (0.016 ms, one shared hit and three reads). Plans are in /tmp/dm-notification-delivery-verified.log. These are warm isolated lookup measurements, not whole-publication latency or production capacity. The latest full Core suite passed 166 tests, zero skipped after the final bounded-warning change (/tmp/dm-notification-delivery-final-core.log).

- Final caller audit forwards shutdown tokens from the remaining legacy backup/birthday/password/digest/leave/transfer notification callers. FeeReminderService now accepts an optional token, forwards it to its existing queries/saves/notification calls, and receives the hosted/manual-request token. Execute loops treat shutdown cancellation separately from failures; this does not coordinate those legacy jobs or fix their existing bulk/cadence transaction gaps. Afghanistan ministry readiness now stages via Core, commits/disposes its transaction, then publishes with cancellation, so external IO no longer holds that ministry lock/transaction. Its existing PostgreSQL test independently counts publication attempts, rejects publication with a live transaction or an inbox row invisible to a separate connection, and retains the repeat-sweep check. Core remained 166 passed / zero skipped after the caller updates (/tmp/dm-notification-cancellation-core.log).

- Thirteenth-increment final integration: Core 166 passed / zero skipped after token-forwarding updates (/tmp/dm-notification-cancellation-core.log); Afghanistan 103 passed / zero skipped, including publication outside the ministry transaction (/tmp/dm-notification-cancellation-afghan.log). Latest shared Core/country packages rebuilt and installed, API build passed (/tmp/dm-notification-cancellation-sync.log). Hosted-service health opt-in and whitespace checks passed. No user server was restarted; restart the API to load the rebuilt cancellation contracts, delivery configuration and additive device-recipient index. Use controlled index rollout on large production tables. No frontend contract changed and the full goal remains active.


### Notification identity boundaries and client lifecycle (fourteenth implementation increment)

Core NotificationAccount identifies an account by school, immutable user ID and actual role. NotificationController, DeviceTokenController and MessageController now check current active membership and return no-store responses. Inbox reads, read markers, deletion, preferences, message participants and mutation ownership use the full identity. Platform ROOT_USER/SUPPORT_AGENT inboxes retain notifications from their source schools, but platform preferences and device lookup use one canonical platform scope. Leader contacts use their actual role rather than pretending every teacher-table row is TEACHER. SchoolNotificationAudience queries only requested role tables in bounded ID batches; bulk StageMany still materializes its legacy result and is not claimed fully bounded.

NotificationRealtime owns bounded SignalR publication using versioned school/role/user groups. The hub accepts only its authenticated account's subscription and caches that connection's membership result. Publishers recheck current active membership before sending. Message receive/edit/delete/reaction/pin events reuse that same routing. Ticket expiry closes the connection. Old school or role connections cannot receive a different account's events; this does not finish global JWT security-stamp/revocation enforcement, push-device ownership, or distributed SignalR routing. Notification category labels now use a request-local per-controller localizer and existing English/Dari/Pashto labels, avoiding process-global culture capture and raw category keys.

NotificationRepository uses no-tracking stable date/ID paging, a repeatable-read snapshot for rows/total/unread, and exposes the unread count in X-Notification-Unread-Count (including CORS exposure). Set-based scoped updates avoid loading the entire inbox for mark-all/delete-read. Preference patches serialize through a database advisory transaction lock, reload cached tracked rows and merge only submitted categories. Existing preference records are reused. The NotificationAccountScope migration makes the school FK optional for platform preferences, preserves original IDs/values/source-school fields as inactive history, selects opt-out on conflicting legacy values, and adds two active-account unique indexes plus a scope check. It does not delete preference history. Down refuses to restore a required school FK while any null-school history exists; it requires a reviewed rollback rather than inventing schools or discarding rows.

SPA Core shares one notification-hub connection among inbox/bell/message consumers for each immutable account. Metadata rerenders and token renewal reuse it; reconnect resubscribes and refreshes authoritative data. Duplicate incoming IDs are bounded/deduplicated, burst refreshes are coalesced, and native alerts are emitted once and closed on account change. Core useReloadableRead cancels obsolete reads; mutation callbacks pin their original token through Axios interception and cannot refresh another account. The new snapshot header avoids a separate unread request on current hosts. AuthProvider resets private child state on an actor/school/role change, while preserving drafts on same-account token renewal. These are account boundaries; parked navigation/workspace tabs remain unimplemented.

Evidence: NotificationAccountScopeTests use actual HTTP/Kestrel and raw SignalR WebSockets with colliding teacher/student IDs, independent school/platform identities, concurrent preference patches, cached contexts, bulk markers, school transfers, leadership roles, message mutations/events and ticket expiry. A command interceptor commits another notification between page queries to verify snapshot consistency. Concurrent en/fa/ps requests verify per-request labels and unread headers. NotificationScopeMigrationTests verify retained legacy rows, canonical platform preferences, constraints/index metadata and guarded downgrade. Full Core: 171 passed, zero skipped (/tmp/dm-notification-identity-core-verified.log). scripts/tests/notification-scopes.cjs exercises actual hooks/AuthProvider/API modules with controlled transports: shared connections, deduplicated events, coalesced reads, reconnect, cancellation, delayed old connection startup, stale read/write guards, pinned tokens and draft boundaries. It is now included in the full table/UI gate. Core TypeScript and this lifecycle regression passed.

The isolated PostgreSQL harnesses now stop and remove their own private clusters on success or failure, retain bounded failure logs, preserve the original failing exit status and refuse unverified-live/symlinked cleanup. A real forced-exit-7 probe verified failure cleanup. About 35 GiB of accumulated stopped test clusters were reclaimed after a disk-full test failure; no live/user database was removed. Subsequent full Core runs passed and cleaned up. Unverified old directories were retained.

Remaining work includes global account/stamp revalidation, device re-registration/revocation, legacy bulk recipient/message/contact materialization, message concurrency/replay, preference editor stale full-map writes, other background jobs, distributed quotas/backplanes/classroom state, remaining editor/invariant/query/output audits and representative whole-app load/telemetry. All seven completion requirements remain open. Package integration and consumer verification follow below.


- Fourteenth-increment final integration: Core 171 passed / zero skipped (/tmp/dm-notification-identity-core-verified.log); Afghanistan 103 passed / zero skipped (/tmp/dm-notification-scope-afghan.log). The country fee-reminder fixture now uses the shared controller's updated constructor. Shared backend/country packages rebuilt and installed, API build passed (/tmp/dm-notification-scope-dotnet-sync.log); shared SPA packages installed (/tmp/dm-notification-scope-spa-sync.log), Core/shell TypeScript passed, and the complete 104-table multilingual UI/PDF gate including notification lifecycle regression passed (/tmp/dm-notification-scope-full-ui.log). Translation parity, hosted-service opt-in and whitespace checks passed. No user-owned server was restarted and no live user database was modified by tests. Restart API and SPA to load installed packages; reconnect clients and use the documented controlled preference-schema rollout. All seven goal requirements remain open.


### Cross-host account session validation (fifteenth implementation increment)

Core reuses the existing StaffUser/User security-stamp pattern for School, Teacher, Student and Parent, adding one opaque Guid to each existing account table and a shared ISecurityStampedAccount contract. No parallel account/session table is introduced. DataContext's existing tracked-change pass advances stamps for actual credential, activation, school and role changes on both SaveChanges paths. Ordinary name/address/profile changes preserve sessions. Existing staff/root/support explicit stamp rotation remains compatible. Direct SQL/ExecuteUpdate writers must rotate stamps themselves; this tracked-change hook does not intercept arbitrary database writes.

SchoolTokenValidation now checks every role, including ROOT_USER, against the active current database account, exact school/actual role and stamp. School-bound identities also require an active school; platform identities require the platform scope. Ordinary roles use a no-tracking scalar indexed account lookup instead of the old school-only check. Staff add a projection of current tenant-bound active grants, replacing Include of the account/profile/assignment graph. No validity cache is shared across requests/hosts. The existing pre-auth request admission gate remains important because authentication performs database work.

AuthService captures the stamp of the password-verified entity, and TokenService rejects a stale snapshot before minting, preventing a concurrent reset from upgrading an old verified password to a new-stamp token. Every login now awaits token generation rather than blocking on Task.Result. Root impersonation carries both target and authenticating root stamps; subsequent requests reject it if either changes. Impersonation refuses inactive targets and maps a racing account change to 401. Teacher authentication returns the actual leader role, and password resolution/verify/change supports PRINCIPAL and HEAD_MASTER with exact-role checks. An old teacher-role reset target cannot reset a promoted account.

SchoolAccountSecurityStamps adds/backfills distinct nonempty stamps without changing account IDs, credentials, names, statuses or relationships. Runtime/snapshot metadata agree. Stop old writers during the controlled migration/release; pre-upgrade school/root tokens lack required stamps and must sign in again. Down drops only the four added fields; re-upgrade creates new stamps and requires another sign-in. Existing staff/support stamp claims retain their name. No country-specific identity model was created.

Evidence: AccountSessionTests starts two real JWT/Kestrel hosts sharing only private PostgreSQL. All seven account types authenticate, then old tokens fail on both hosts after password changes, deactivation/reactivation, role changes and transfers; platform root remains independent of school activation. It covers colliding teacher/student IDs, missing/wrong stamps, leadership password paths, root impersonation revocation, a stale token-mint snapshot and metadata-preserved sessions. A command interceptor performs an independent password reset between actual password verification and token stamp lookup: the HTTP login is rejected, and a fresh password login succeeds. Scalar query inspection excludes credentials/profile columns and tracking; cancellation is exercised against an actual exclusive table lock. A dedicated migration database verifies up/down/up, preserved credentials/records, distinct stamps and runtime/snapshot parity. Full Core: 174 passed / zero skipped (/tmp/dm-session-races-core.log). The existing frontend auth-role contract regression passed. Client session-rejection handling is described below; no translated UI strings were added.

This completes the shared HTTP validation change, not immediate revocation of already-open SignalR connections or push subscriptions. Those require stamp-bound publication/routing and hub rechecks; password-reset token consumption/transaction races, device ownership, legacy jobs, distributed quotas/backplane/classroom state, other editor/invariant/query/output audits and full-app load/telemetry remain open. All seven completion requirements remain unchecked.


- Final migration review found the older PlatformSupportWorkflow migration backfilled existing User stamps with Guid.Empty. SchoolAccountSecurityStamps now initializes only empty User/StaffUser stamps, preserving every valid existing stamp. The migration regression seeds legacy empty root/staff stamps and a valid root stamp to verify repair/preservation; latest Core remained 174 passed / zero skipped (/tmp/dm-session-legacy-core.log). Without this repair an existing root account could be unable to mint a new valid token. The repair is retained on downgrade, alongside preserved credentials/history.


SPA Core now handles a protected HTTP 401 for the current bearer token through its existing AuthProvider/AuthRoute flow: clear the current login/private subtree and return to sign-in. The interceptor and provider both verify token ownership, so a delayed rejection from an older login/token cannot clear a newer account. Failed /auth submissions remain ordinary form errors. The actual Axios/AuthProvider lifecycle regression verifies old-account rejection, current-account logout and failed-login preservation; Core TypeScript passed. Packages were rebuilt/installed; final consumer/UI evidence follows below. Existing already-open hub/push revocation is still open and is not implied by this HTTP logout behavior.


- Fifteenth-increment final integration: latest full Core 174 passed / zero skipped, including legacy-stamp repair (/tmp/dm-session-legacy-core.log); Afghanistan 103 passed / zero skipped after the final backend pack (/tmp/dm-session-final-afghan.log). Core/country packages rebuilt and installed and API build passed (/tmp/dm-session-final-dotnet-sync.log). SPA packages rebuilt/installed (/tmp/dm-session-spa-sync.log), Core/shell TypeScript passed, actual Axios/AuthProvider rejection regression passed, and the full 104-table multilingual UI/PDF gate passed (/tmp/dm-session-full-ui.log). Translation parity, hosted-service opt-in, shell syntax and whitespace checks passed. No user-owned server was restarted or live user database modified by tests. Restart API and SPA, apply the coordinated migration rollout, and sign in again for pre-upgrade school/root sessions. All seven top-level requirements remain open; established SignalR/push revocation, reset-consumption races and distributed-state/load work are not completed by these checks.


### Stamp-bound notification realtime routing (sixteenth implementation increment)

NotificationHub and NotificationRealtime now derive version-3 addresses from school, immutable ID, actual role and the current database security stamp. No version-2 or GUID-only fallback remains. A connected old-stamp socket is not targeted by later publications; Subscribe rechecks current stamps and aborts stale sessions. Unsubscribe removes only its own stored group. Authentication expiry still closes connections. AccountSessionState.ImpersonatorIsCurrent is shared by HTTP and hub validation rather than duplicating the root policy.

Root impersonation joins only a target-stamp/root-stamp address, never the target's ordinary group. Publishers derive eligible root addresses from active current database roots in 100-row native UUID keyset pages and emit bounded group batches. This preserves impersonation without a per-connection polling timer or a process-only registry that another publisher cannot consult. A root password/stamp/status change excludes old impersonation groups from future publication independently of which API instance accepted the socket. The normal delivery gate and whole-publication deadline bound these sends; timed-out delivery is best effort. Already-queued/in-flight frames cannot be recalled, and idle stale sockets may remain physically connected until invocation, expiry or disconnect. No shared SignalR backplane is supplied by this routing change.

Staff message receive/edit/delete/reaction/pin events recheck the current messages.send capability through existing SchoolNotificationAudience/CapabilityCatalog expansion. MESSAGE notification staging/publication uses the same capability check, so revocation does not leave a future-message inbox/push bypass. General system notices remain available. This extends the existing access model; it does not invent a parallel role catalog or stamp every capability edit.

The new root-address source initially scanned 50,000 unrelated support users in an actual publisher plan. NotificationRootRouteIndex adds only a nonunique partial User(Id) index for active ROOT_USER rows with nonempty stamps. Runtime metadata, migration and snapshot agree; no user or credential values are rewritten. The focused warm fixture improved from 3.027 ms / 1,064 shared-buffer hits to 0.013 ms / one hit and one read, using the partial index (/tmp/dm-realtime-root-plan-indexed.log). This is a source-query measurement, not end-to-end throughput or a production user-count claim. Index installation uses ordinary DDL and needs the controlled production rollout on large tables.

Evidence: NotificationSessionTests uses real JWTs, raw SignalR sockets and two real API hosts against private PostgreSQL. Each host's publisher excludes old target/root stamps; fresh sessions receive events; stale resubscription closes; stale JWT upgrades are rejected. It covers root deactivation, ordinary/message events, foreign subscription IDs, staff capability removal/regrant and prerequisite expansion. Separate batch coverage checks all eligible root addresses, batches of at most 100, inactive/support exclusion and no legacy groups. Real before/after EXPLAIN (ANALYZE, BUFFERS), index up/down/up row-count preservation and model/snapshot parity are verified. Older notification scope tests now supply actual test-account stamps; transport doubles record group batches. Full Core: 178 passed / zero skipped (/tmp/dm-realtime-stamps-verified-core.log).

A previously timing-sensitive fee-rollover cancellation assertion failed when its 100 ms timeout fired before entering the provider. The regression now waits for the provider's Started signal before explicit cancellation, then checks the exact forwarded token. This preserves the original cancellation invariant without depending on CI/server speed.

Remaining scope includes classroom signaling authorization/revocation/state, push-device registration/ownership and stamp lifecycle, password-reset token consumption races, connection admission, distributed quotas/backplane, other legacy jobs and remaining editor/invariant/query/output/load audits. All seven top-level requirements remain unchecked. Package/consumer integration evidence follows below.


- Sixteenth-increment final integration: Core 178 passed / zero skipped (/tmp/dm-realtime-stamps-verified-core.log); Afghanistan 103 passed / zero skipped (/tmp/dm-realtime-stamps-afghan.log). Core/country packages rebuilt and installed and API build passed (/tmp/dm-realtime-stamps-sync.log). Focused root-route before/after plans and migration preservation passed (/tmp/dm-realtime-root-plan-indexed.log). Translation parity, hosted-service opt-in, shell syntax and whitespace checks passed. No frontend source/protocol changed, no user server was restarted, and no live user database was modified by tests. Restart every API host together and reconnect browser hubs; schedule the additive root index through the documented controlled rollout. All seven top-level completion requirements remain open.


### Atomic push-device ownership and session binding (seventeenth implementation increment)

Core DeviceTokenRepository now owns registration/unregistration using the existing DeviceToken records. A SHA-256 fingerprint supplies a fixed 64-character index/lock key for opaque tokens up to 8,000 characters, avoiding PostgreSQL's oversized raw-token btree keys. Each operation owns a clean transaction, serializes on that fingerprint through a PostgreSQL advisory lock, and rechecks current full account identity/security stamp after waiting. Repeated same-owner/current-stamp registration returns the existing binding ID. An owner/session change retires the previous binding and inserts a new row atomically, retaining prior identity/token data under the existing retention policy. A stale logout cannot remove another school's/role's/newer session's binding. Rollback/cancellation leave the prior owner intact. No caller-supplied owner or stamp is trusted and no automatic mutation retry was added.

DeviceTokenAccountBinding adds nullable AccountSecurityStamp/TokenFingerprint to the existing table, an active-binding check and a partial unique fingerprint index. Legacy active bindings cannot be proven current and are archived without deleting their IDs, token strings or ownership metadata; SDKs must register again after rollout. There is no guessed winner among historical duplicates and no assignment to a fabricated school. Downgrade removes the new schema but does not reactivate retired bindings. Runtime/snapshot metadata match. Token credentials, fingerprints and stamps are excluded from new audit snapshots. The migration removes those credential fields from valid existing DeviceToken audit JSON while preserving action/actor/entity/school metadata and nonsecret fields; malformed/non-object device snapshots are cleared because their contents cannot be safely retained. Other entity snapshots are unchanged. Redaction is deliberately not reversed on downgrade.

Push publication now checks the account's current stamp for each 100-device page and restricts devices to that stamp plus exact school/ID/role/activity. Password changes and retired owners are excluded from subsequent reads. Network IO stays outside registration transactions; already-detached/in-flight/provider-queued messages cannot be recalled, and this supplies neither an external-delivery outbox nor exactly-once delivery. Existing network/publication budgets remain in force.

The existing register/delete routes remain. DELETE accepts an optional JSON token body and retains small-token query compatibility; both forms together must agree. JSON bodies are bounded at 64 KiB, token values at 8,000 characters, platforms at known enums, and embedded nulls are rejected. The shared SPA push API sends unregister tokens in the body and captures the original login before asynchronous Axios interception, with optional cancellation/explicit token options. Old SDK callbacks cannot acquire a new login's bearer credentials. No UI strings, country-specific registration path or parallel device store was introduced.

Evidence: DeviceTokenBindingTests runs actual JWT HTTP requests against two API hosts sharing private PostgreSQL: twenty duplicate long-token registrations produce one ID, competing teacher/student identities with a colliding UUID leave one active owner, losing-owner logout cannot remove it, and transport snapshots reach only the current owner. Password reset excludes old-device delivery, stale JWT unregister fails, fresh registration creates a new binding, unregister archives history, and query compatibility/invalid platforms are verified. Further tests exercise a different school's account, actual advisory-lock waits, stamp changes while blocked, cancellation, synthetic save failure rolling back retirement, successful retry, database uniqueness/active-check enforcement and real audit interception without credentials. A dedicated migration database verifies preserved legacy tokens/IDs, inactive unverified bindings, scoped credential redaction, malformed snapshots, metadata parity and down/up preservation. Full Core: 181 passed / zero skipped (/tmp/dm-push-binding-complete-core.log). Actual SPA Axios lifecycle regression covers original-login token capture and 8,000-character unregister bodies.

The enlarged multi-database suite exhausted the private cluster's 100-connection limit because independent per-database pools retained idle connections. The Core harness now disables pooling only in private test connection strings, and xUnit runs at most four unrelated test classes concurrently. Concurrency inside each HTTP/database race remains unchanged; no production connection limit was increased. The explicit multiplexing-rejection test enables pooling for its deliberately valid Npgsql/multiplexed input so it still tests the coordinator's rejection. The publication deadline regression now permits the budget to expire during DB work before the first network send, verifies the fanout-expiration log, and still requires all committed inbox rows and bounded sends. Its previous required-first-send assertion was invalid on a busy unpooled fixture.

Remaining scope includes client-intent ordering for delayed registrations from different still-valid logins, reset-token consumption races, classroom authorization/state/revocation, connection admission, distributed quotas/backplane, other legacy jobs and editor/invariant/query/output/load audits. Registration is serialized in server order; token pinning alone does not prove which login intent is newest. There is no blanket production capacity claim, device quota/UI, provider-queue recall or guarantee about third-party publishers bypassing Core. All seven top-level requirements remain unchecked. Final package/consumer verification follows below.


- Seventeenth-increment final integration: Core 181 passed / zero skipped (/tmp/dm-push-binding-complete-core.log); Afghanistan 103 passed / zero skipped (/tmp/dm-push-binding-afghan.log). Core/country and SPA packages rebuilt and installed, API build passed (/tmp/dm-push-binding-sync-dotnet.log, /tmp/dm-push-binding-sync-spa.log). Core/shell TypeScript, actual Axios push lifecycle/body regression, the full 104-table multilingual UI/PDF gate (/tmp/dm-push-binding-full-ui.log), translation parity, hosted-service opt-in, shell syntax and whitespace checks passed. No user server was restarted or live user database modified by tests. Restart API and SPA together; SDKs must register again after the documented legacy-binding quarantine/credential redaction rollout. All seven top-level completion requirements remain open.


### Atomic password recovery and self-service changes (eighteenth implementation increment)

Core PasswordResetRepository now owns reset issuance, confirmation and verified password changes. Confirmation locks the existing account row using a fixed role/table whitelist and parameterized ID, reads database time after the wait, rechecks current full school/ID/role/stamp plus live token state, then commits the credential/version/stamp update and sibling-token invalidation in one transaction. Competing uses of one token or different tokens for that snapshot have one winner. Expiry/stamp/tenant changes while waiting reject rather than trusting the pre-lock lookup. A failure after credential SaveChanges but before consumption rolls everything back; cancellation leaves no partial password change. No network delivery occurs while holding the credential transaction.

The existing Session snapshot type now carries reset email resolution, including actual leadership roles, school and stamp, rather than introducing a parallel identity object. Issuance locks/rechecks that snapshot so a request which waited past another credential change cannot mint a fresh-epoch recovery token. Expiry is thirty minutes from database time. Authenticated Change verifies the current password inside the same account lock and requires the caller's JWT stamp. Standalone SetPassword also uses the shared transaction and invalidates outstanding tokens for the exact account scope. User/role/tenant collisions cannot consume another identity's tokens. All five legacy School/Teacher/Student/Parent/Root updatePassword routes delegate through Core BaseController to this atomic method and retain their existing response shapes. They identify the account by immutable claims rather than a potentially stale email claim.

School/ID/role/stamp-bound reset records reuse the existing PasswordResetToken table. PasswordResetAccountBinding adds nullable school/stamp columns, an active-binding/hash-length/consumption check and a unique bound-token SHA-256 lookup index which retains uniqueness after consumption. Legacy token IDs, hashes, expiry and consumption timestamps remain intact but unbound links are retired; users must request a new link after rollout. Downgrade drops the additions without reactivating retired tokens. Core prevents changing authorization/expiry fields on existing tracked reset records. Token rows are excluded from noisy/credential-bearing generic audit snapshots; ordinary credential audit handling remains. Runtime/snapshot metadata agree.

Email is now treated as an authentication identifier: a normalized address change advances the existing account stamp on both save paths, while case/whitespace-only normalization and ordinary name/address edits preserve it. This supersedes earlier notes treating all profile fields as session-neutral. Outstanding links/sessions cannot survive reassignment to another recovery address. Existing school/root/staff stamp validation and notification routing reuse that epoch. Old reset/lockout/password-change notices now use the actual school and actual account role instead of Guid.Empty, which had caused school recipients to be rejected by current membership checks. The existing notification/preference/transport delivery policy is retained; no encrypted recovery-email outbox or DB-wide secrecy claim is supplied. Notification action URLs can contain the reset link. This does not mean a hash-only token record makes every database/backup surface secret.

The existing confirm/change/request bodies are bounded at 16 KiB and the repository enforces the existing minimum password length. Public unknown/inactive reset requests retain the same success body, without claiming equal lookup/delivery timing. Request cancellation flows through SQL, row locks and writes; token cleanup now forwards its shutdown token. No country-specific authentication fork or new UI strings were added.

Evidence: PasswordResetConcurrencyTests uses real anonymous request/confirm HTTP against two JWT-configured Kestrel hosts and private PostgreSQL. Twelve simultaneous confirmations have exactly one success, the winning password/stamp persists, siblings are invalidated, and a student with the teacher's same UUID remains untouched. The notice is school-scoped and the password-change notice occurs only after success. Other cases cover expiry during a real row-lock wait, cancellation, failure specifically during invalidation after the password write, rollback/retry, token reuse, school transfer, recovery-email change and stale issuance after a blocked request. All five real legacy controller actions are invoked concurrently with scoped dependencies and stale email claims: one version wins for each account type. A separate migration database verifies retained duplicate legacy hashes/consumption timestamps, disabled old links, nullable metadata, index parity and down/up preservation. Existing all-account session/stamp and dynamic-role tests use the new Session resolution contract. Full Core: 185 passed / zero skipped (/tmp/dm-password-reset-complete-core.log).

Remaining scope includes administrator temporary-password mutation replay/intent, recovery delivery privacy/durability, delayed push registration intent ordering, classroom authorization/state/revocation, connection admission, distributed quota/backplane work, other legacy jobs and the remaining editor/invariant/query/output/load audits. All seven top-level completion requirements stay unchecked. Package/consumer verification follows below.


- Eighteenth-increment final integration: latest Core 185 passed / zero skipped (/tmp/dm-password-reset-final-core.log), including canonical platform scope and structural binding checks; Afghanistan 103 passed / zero skipped after the installed package rebuild (/tmp/dm-password-reset-installed-afghan.log). Core/country packages rebuilt and installed, API build passed (/tmp/dm-password-reset-installed-sync.log). Targeted frontend auth-role and actual Axios/AuthProvider session lifecycle checks passed (/tmp/dm-password-reset-auth-ui.log, /tmp/dm-password-reset-session-ui.log); no frontend source/API payload changed. Translation parity, hosted-service opt-in, shell syntax and whitespace checks passed. Token-reaper shutdown cancellation now exits without recording a failed heartbeat. No user server was restarted or live user database modified by tests. Restart all API hosts together, retire old writers and request fresh reset links after the documented migration rollout. All seven top-level requirements remain open.


- Final committed-source check: the four focused reset/legacy-action regressions passed after safe formatting of synthetic fixture assignments (/tmp/dm-password-reset-final-focused.log); committed Core/country packages rebuilt/installed and API build passed again (/tmp/dm-password-reset-committed-sync.log). The full 185-test result and 103-test country result above remain the broader behavioral evidence. No secret-scan bypass, user-server restart or live-data test was used.

### Shared request quotas (nineteenth implementation increment)

Core replaces the unbounded process dictionaries for failed logins and password-reset requests with `SharedThrottleStore`. The existing AspNetCoreRateLimit endpoint rules also use its PostgreSQL processing strategy. Independent API hosts and restarts now share fixed-window counts; no memory fallback admits requests when storage fails. A separate infrastructure table is necessary because existing business records do not represent anonymous pre-authentication quotas. Raw email addresses, IPs, URLs and account IDs are replaced with purpose-separated HMAC-SHA256 keys using the existing shared signing secret. Counters are excluded from generic audit snapshots.

Allocation uses one capacity row, default 100,000 buckets, and deletes at most 500 expired rows per cleanup. Live quotas are never evicted to make space. Existing counters use row locks without the capacity lock; allocation/count/cleanup commit together. Store operations have a two-second default cancellation budget. Capacity exhaustion, configuration mismatch on allocation and unavailable storage produce localized no-store 503 responses with `server_busy` and `Retry-After: 2`. Request ingress still bounds work per process before these SQL calls. Health, static content and unmatched routes bypass the SQL endpoint limiter. This is shared rate limiting, not distributed concurrent-request admission or a SignalR backplane.

Login failure thresholds remain five per normalized email and twenty per canonical IP, with fifteen-minute windows/lockouts. Only the transaction crossing the email threshold triggers its owner notice. Further failures do not extend an active lock; successful authentication clears the email counter but preserves the aggregate IP budget. This counts completed failures: already-admitted concurrent authentication calls can finish after a threshold. Reset requests share three per email and ten per IP per fifteen minutes, including unknown accounts. Missing addresses share an unknown-address bucket. General endpoint limits retain the existing configured rules. Raw `X-Real-IP`/`X-ClientId` cannot override the address or whitelist a caller: use the host's validated ForwardedHeaders/RemoteIpAddress pipeline.

Deployment requires the additive `SharedRequestThrottles` migration and coordinated API rollout. All instances must share the database, signing key, endpoint policy and bucket capacity. Changing the signing key changes the counter namespace; coordinate credential/key rotation rather than relying on old limits surviving it. `SharedRateLimiting:OperationTimeoutMs` permits 100–10,000 ms. `MaximumBuckets` permits 4–1,000,000 but changing it also requires an explicit coordinated update to the singleton database capacity, preserving its current count; setting an environment variable alone does not resize storage. Downgrade discards only ephemeral quotas and requires stopping all writers. No school/credential/business history is rewritten. The library's memory registration remains for static policy services; counter processing is explicitly replaced by PostgreSQL.

Evidence: real independent HTTP hosts share a five-request rule despite spoofed identity headers, and a third host remains limited after restart. Storage loss returns 503; health and 404 requests do not allocate counters. Independent stores race API/reset/login counters, verify single lockout notification decisions, IP normalization, preserved IP failures, exact bounded allocation and count reconciliation, expiry reclamation, cancellation/timeouts, and successful hot counter updates while allocation is locked. Migration up/down/up and runtime/snapshot property parity are verified. Database-age projection keeps the library's local-clock checks consistent across host clock skew. These tests establish quota behavior, not production throughput or total supported users. The seven-area checklist remains open, including distributed classroom/SignalR state, broader mutation/editor/invariant audits, imports/exports and whole-application load/telemetry evidence.

Integrated validation for this increment: Core 193 passed, zero skipped (`/tmp/dm-shared-throttle-final-core.log`); Afghanistan 103 passed, zero skipped (`/tmp/dm-shared-throttle-afghan.log`). The full Core run includes eight new throttle tests. Shared backend packages were rebuilt, packed and installed and the API built successfully (`/tmp/dm-shared-throttle-sync.log`). Strict locale parity and hosted-service checks passed. No frontend source changed. User servers were not restarted; restart API to load Core and run its coordinated migration startup.

### Classroom invocation boundaries (twentieth implementation increment)

The classroom audit found client-selected room IDs and HOST roles plus unrestricted direct signaling targets; only staff previously had an extra invocation filter. Core now reuses that filter as `ClassHubAccessFilter`, applying current account role/school/stamp and root-impersonator checks to every classroom invocation. Staff retain the live messages.send requirement. Course rooms require an active course/class in the caller's school: enrolled active students can attend, assigned course/schedule teachers can host, and school administrators/principal/head-master can host or attend. Parent/staff/platform identities cannot join course rooms. The client cannot turn an enrolled student into a HOST. Nonexistent/inactive/unrelated rooms and fabricated breakout rooms are denied before allocation.

Direct legacy thread IDs require the caller to be one of the two real, active school accounts, including the peer staff grant. Because those legacy IDs omit school and role, each GUID must be globally unambiguous across role tables; colliding identities are denied rather than sharing an unrelated call. The room payload stays compatible for ordinary existing clients. A future role-qualified/school-qualified direct room contract is still required to enable ambiguous legitimate identities, rather than weakening this check. Current non-join invocations require actual room admission; room arguments must match the joined room and signaling/moderation targets must belong to it (pending admission and active-family breakout reassignment have explicit exceptions). Switching room through JoinClass leaves the previous room. These checks also run for already-established sockets after enrollment removal, staff grant changes or account deactivation.

Classroom participant replacement, kick cooldown and poll voter identity now include school and actual account role, preventing matching teacher/student GUIDs from replacing or sharing each other's state. A replaced socket is removed from its SignalR group as well as the participant dictionary. Classroom sockets close at ticket expiry, matching the notification hub's existing expiration option. Localized access errors reuse the existing English/Dari/Pashto resources under the renamed filter.

Evidence: real Kestrel WebSockets and JWT validation verify student host-role spoofing, nonexistent course/breakout IDs, enrolled versus unrelated students, cross-school attempts, permitted teacher/student signaling, unrelated peer IDs/room arguments, live enrollment withdrawal and account deactivation. A teacher and enrolled student deliberately share a GUID and both remain present. Direct-call tests cover valid participants, forged/cross-school pairs and a cross-school role-table GUID collision. The existing dynamic staff-role test remains part of regression coverage. These are incoming invocation protections, not a claim of complete classroom security or scale-out.

Remaining classroom work is explicit: room/connection/event state is still process-local; outgoing group delivery does not yet recheck every recipient's stamp/enrollment; a now-revoked idle socket can receive until disconnection or a future publication redesign. Shared backplane/state, bounded connection/method/media/history budgets, complete lifecycle/expiry cleanup and admission races, substitute-specific online authority, role-qualified direct IDs and breakouts' per-assignee enforcement still need implementation and cross-instance failure tests. All seven goal requirements remain open. No new parallel domain tables, country code or frontend strings were introduced here.

Integrated validation: Core 195 passed, zero skipped (`/tmp/dm-class-access-final-core.log`); Afghanistan 103 passed, zero skipped (`/tmp/dm-class-access-afghan.log`). Shared backend/country packages rebuilt and installed and API built successfully (`/tmp/dm-class-access-sync.log`). Strict locale parity, hosted-service checks and whitespace checks passed. Restart API to load the package; no user server was restarted and no database migration is added by this increment.

### Classroom recipient checks and bounded publication (twenty-first implementation increment)

Core now wraps ClassHub delivery in its existing hub filter for invocations and connection/disconnection callbacks. It resolves actual room members to connection targets and rechecks each authenticated snapshot before network dispatch; there is no unchecked group fallback. Course/class/school status, actual account role/school/stamp, active enrollment, teacher assignments and staff messaging grants are current database reads. Impersonated recipients also require the original root stamp/status. Direct legacy rooms retain their global identity ambiguity checks. Authorization reads use at most 100 connection snapshots at a time and role-specific projections rather than one account query per student. Final breakout-control events can still reach currently entitled members after the parent breakout map is removed; incoming joins continue to require an active breakout.

ClassroomConnections retains only authenticated routing snapshots and the current authorized room, separately from historical classroom content. Admission defaults to 1,024 connections per API instance, with no waiting queue, and releases slots on disconnect/failed startup. Classroom publication defaults to eight active operations, no queue, and a two-second whole-publication budget covering database checks and network calls. Each network call reuses Core NotificationDeliveryGate in a dedicated classroom pool, preserving inbox/push/SMS transport capacity. No EF work is placed inside the transport callback. Store failure, deadline or overload drops best-effort publication rather than sending to an unchecked audience or retrying a mutation. Network tasks that ignore cancellation retain their transport slot until they really finish. A receiver already queued/in flight before a revocation cannot be recalled; authorization checks and a later revocation are not one atomic network operation.

Configure ClassroomDelivery:MaxConnections (1–4,096), MaxConcurrentPublications (1–32) and OperationTimeoutMs (100–10,000); defaults are 1,024/8/2,000. Invalid settings fail startup. The DigitalMaktab.Classrooms Meter exposes aggregate connection/admission/publication/exclusion counts, with only bounded drop-reason labels and no school/account/room/URL identifiers. Collection/export remains open. Connection exhaustion closes the new hub connection rather than retaining an unauthenticated waiting queue.

Evidence: real JWT/WebSocket tests leave recipients idle while credentials reset, enrollment is withdrawn, account deactivates or an impersonating root deactivates; healthy recipients continue receiving and stale recipients do not. A fresh login receives subsequent events while the old snapshot remains excluded. Direct-call grant removal prevents subsequent calls. A two-slot host rejects another connection and admits a replacement after disconnect. A 102-student fixture crosses the 100-recipient boundary, excludes a deactivated student and verifies all healthy students receive. An injected membership-query failure drops both early/late batch recipients without unchecked delivery, and later publication resumes when the lookup recovers. This is targeted fan-out correctness, not an application throughput/load result or a recommended production capacity.

This supersedes the prior increment's known idle-recipient publication gap for publications through the guarded ClassHub path. It does not provide a backplane/shared classroom state: the routing registry and legacy room content are still process-local, and incompatible API versions must not serve together. Do not publish through a raw external IHubContext<ClassHub> or global/user proxies; the hub has no authorized global audience. Remaining work includes shared lifecycle/content state, distributed delivery, whole-method admission/budgets, tenant fairness, aggregate history/media limits, session epochs/expiry and orphan cleanup, typed legacy direct IDs, substitute authority, breakout assignment enforcement, plus the other top-level concurrency/query/mutation/load requirements. All seven completion boxes remain open.

Integrated validation: Core 199 passed, zero skipped (`/tmp/dm-class-audience-final-core.log`); Afghanistan 103 passed, zero skipped (`/tmp/dm-class-audience-afghan.log`). The recipient suite includes an actual-role mismatch from a legacy set-based writer even without stamp rotation. Shared backend/country packages rebuilt and installed and API built successfully (`/tmp/dm-class-audience-final-sync.log`). Strict locale parity, hosted-service and whitespace checks passed. No frontend code or migration was needed. Restart API to load the new package; user servers were not restarted.

### Classroom method admission and shared deadlines (twenty-second implementation increment)

Core ClassroomInvocations now admits at most 32 classroom methods per instance and eight per school by default, with no waiting queue. Admission precedes database account/stamp/room authorization. Its school partitions exist only while calls run and are removed on release; dictionary growth is bounded by active admitted work. A signed caller's school selects a capacity partition, never an authorization grant. Current account/stamp/room checks still run after admission. Other schools can use the remaining global capacity when one reaches its school limit.

The existing ClassroomDelivery OperationTimeoutMs now supplies a single invocation budget (two seconds by default), including authorization reads, every subsequent publication and group add/remove. Nested sends inherit that budget instead of starting a fresh allowance for each message. Standalone lifecycle publications retain their existing local publication bounds. Database command timeouts and cancellation are forwarded explicitly. Cooperative deadline expiry and authorization database errors return Core's existing localized RequestCapacity Busy message as a SignalR HubException, without provider details or automatic retries. Metrics add aggregate active/rejected/unavailable method counts with bounded reason tags.

A method that ignores cancellation keeps its admission lease until its body really settles; the implementation does not abandon that task and free capacity early. This is cooperative cancellation, not a forced CPU/thread interruption. A timed-out classroom operation may already have changed ephemeral room state or emitted earlier events; a busy completion does not imply rollback or permit automatic mutation replay. Method scope/deadline restoration isolates later calls. Existing HTTP request admission, publication limits and recipient authorization remain in force.

Configure ClassroomDelivery:MaxConcurrentInvocations (1–128, default 32), MaxInvocationsPerSchool (1–min(64, global), default eight). OperationTimeoutMs remains 100–10,000, default 2,000, and invalid combinations fail startup. These are per-instance caps, not a distributed queue/fair scheduler. Budget total API/classroom/background connections across all replicas; these defaults are not a supported-user or throughput promise.

Evidence: real JWT/WebSocket hosts hold authorization reads and show same-school/global excess calls are rejected before another database command, while a different school is admitted; deadline cancellation releases all slots and later calls recover. A simulated provider exception yields the localized busy error without its private marker. A 10,000-school churn test keeps partition count at the active-work bound and verifies idempotent release. A noncooperating body stays admitted after timeout until released, preventing abandoned work accumulation. Slow audience lookups prove all bootstrap sends share one invocation deadline, and a group-manager probe receives its cancellation. Healthy calls after timeout prove scope restoration. This does not establish distributed classroom routing/state or total application capacity.

Remaining scope includes handshake/authentication admission before socket lifecycle, per-account/school connection fairness, legacy room/history/media limits and cleanup, shared state/backplane/session epochs, typed direct rooms, substitute/breakout assignments, and the other top-level mutation/editor/query/job/load/telemetry audits. All seven original completion requirements remain unchecked.

Integrated validation: Core 204 passed, zero skipped (`/tmp/dm-class-methods-final-core.log`); Afghanistan 103 passed, zero skipped (`/tmp/dm-class-methods-afghan.log`). Shared backend/country packages rebuilt and installed and API built successfully (`/tmp/dm-class-methods-sync.log`). Strict locale parity, hosted-service and whitespace checks passed. No migration/frontend change was required. Restart API for the new package; user servers were left under user control.

### Classroom history budgets and browser ownership (twenty-third implementation increment)

The [state audit](../digitalmaktab-core/docs/CLASSROOM-STATE-AUDIT.md) inventories every existing room map and its remaining bounds/lifecycle gaps. Core ClassroomState now owns those same 14 maps per API host, instead of mutable static fields on transient hubs. No parallel domain model or database table was introduced. A same-process two-host test proves histories remain separate; in-process static sharing must never masquerade as a successful distributed-state test. Shared storage/backplane work is still required.

Chat retention now enforces both 500 items and a configurable conservative serialized UTF-8 budget, default 2 MiB per room. Single over-budget items are rejected; otherwise oldest messages and their reaction/pin records are evicted together. Body is capped at 8,000 characters, MIME at 128 and reply IDs at server GUID format. Reactions/pins must name a retained message and cannot allocate arbitrary IDs. Reactions use stable account keys with current names, eight emoji types per message and a configurable conservative UTF-16 accounting budget, default 512 KiB per room. Renaming replaces one contribution rather than allocating another; removal/eviction releases charges. Existing name-list snapshots remain wire-compatible; richer contributor identities for same-name UI participants remain open.

Whiteboard retention now enforces both 2,000 strokes and a UTF-8 envelope budget, default 2 MiB per room. Appends and growing updates reject before mutation rather than silently discarding old geometry. Undo/clear release charges; malformed/non-object JSON is rejected. These are content budgets, not exact managed-heap accounting. Metadata, dictionaries, serialization/network buffers and all other room structures add overhead. Total retained room count, orphan/pending/child-session cleanup, QA/poll/voter growth and client render-history/optimistic whiteboard rollback are explicitly unfinished; do not claim process memory is completely bounded.

ClassroomDelivery:ChatHistoryBytes and WhiteboardHistoryBytes permit 64 KiB–16 MiB; ReactionHistoryBytes permits 16 KiB–4 MiB. Invalid settings fail startup. New content-limit/unavailable hub errors have English/Dari/Pashto resources and runtime localization tests. No backend calendar/country policy was duplicated.

Browser review found the existing classroom connection omitted its JWT token factory and swallowed invocation errors. Core now creates an authenticated, account/session-owned connection, accepts same-session token renewal and stops when account/role/school/stamp/impersonator scope changes. JWT payload decoding is only a client lifecycle comparison; server authorization remains authoritative. It supplies the app culture, forwards call errors to the existing Core alert and never retries a mutation. Mount/session ownership disposes connections, peers and media on navigation/terminal join/failed join, including media acquisition finishing after unmount. Rejected chat sends retain draft/attachments/reply; successful sends clear only consumed values. Reaction state resets before server bootstrap rather than erasing the bootstrap afterward. Real browser media devices were not exercised by the automated connection test.

Evidence: real JWT/WebSocket tests verify chat byte eviction, reaction/pin cleanup, phantom-ID rejection, atomic whiteboard append/update/undo/clear, stable contributor renaming, emoji/aggregate reaction limits and charge reclamation, host isolation and localized resource lookup. The browser connection regression tests authentication, app culture, token renewal, role/school/stamp/impersonator changes, guarded events, handler removal, visible failures, no mutation retry and idempotent disposal in all locales. The test is now part of the 104-table shared UI audit. Full application load/heap/backplane evidence and all seven original requirements remain open.

Integrated validation: Core 209 passed, zero skipped (`/tmp/dm-class-history-final-core2.log`); Afghanistan 103 passed, zero skipped (`/tmp/dm-class-history-afghan.log`). Full 104-table UI/export audit, including the new connection test, passed (`/tmp/dm-class-history-final-ui.log`); Core/shell package builds, locale/mobile parity and hosted-service checks passed. Backend packages rebuilt/installed (`/tmp/dm-class-history-dotnet-sync.log`), SPA packages rebuilt/installed (`/tmp/dm-class-history-spa-final-sync2.log`); installed helper/component hashes match Core output. A cold-start-sensitive deadline test was warmed and now uses the normal two-second budget while still proving cancellation of a second send whose standalone delay fits a fresh budget; production defaults were not relaxed. No migration was added and user servers were not restarted. Restart API and SPA to load the swaps.


### Classroom session quotas, generations and cleanup (twenty-fourth implementation increment)

Core retains at most 64 physical rooms per host and 16 per school by default, including reserved breakout rooms before anyone joins them. Allocation is atomic, rejects without evicting another school's live room, and releases school partitions at zero. The same existing 14 state maps remain; no parallel domain records or schema migration were added. Each root session has a generation and an asynchronous gate shared with its children. Room switches acquire roots in stable order, and current database authority is rechecked after waiting. Entry rechecks closure, child reservation and draining status after acquiring the gate. A queued call cannot resurrect a closed generation or child. This serializes commands within a session, including their checked publications; it is not a measured throughput increase or distributed actor.

Ending a parent notifies admitted and waiting main/child connections and clears all descendant state. Ending breakouts recalls waiting children and releases their slots while retaining the parent. Leaving removes only the caller's server-bound membership and remains possible after course/session revocation. Connection bindings include the generation; stale writers cannot mutate a new session. Cleanup rechecks the current binding before aborting, including a child-to-parent move that keeps the same root generation. Browser bootstrap carries the room/generation marker and clears previous room content before applying a changed session's snapshots; same-session token renewal does not discard drafts.

Lazy admission cleanup and a 30-second host-owned worker expire empty sessions after five idle minutes and retire sessions after twelve hours by default. Hard-age expiry closes bound sockets and rejects further ordinary calls, but never deletes an object graph while a body or waiter still owns it. Noncooperating work retains its capacity until it actually finishes. Gates are not disposed underneath waiters. Worker runs report through the existing health tracker; metrics add retained-room and expiry counts with bounded reason labels. These local ephemeral sweeps require no database-wide job claim.

Configuration: ClassroomDelivery MaxRetainedRooms 1–256/default64, MaxRoomsPerSchool 1–global/default16, IdleRetentionMinutes 1–60/default5, MaxSessionHours 1–24/default12; invalid combinations fail startup. Room/content limits do not bound every voter/kick structure, transient serialization buffer or browser history, and do not prove exact heap size or supported-user capacity. Shared classroom state/backplane, connection handshake/fairness, remaining assignment/identity semantics, output/query/editor/job audits and reproducible multi-school load evidence remain unfinished. All seven original completion requirements stay open.

Integrated validation: Core 217 passed / zero skipped (`/tmp/dm-class-lifecycle-final-core5.log`); Afghanistan 103 passed / zero skipped against rebuilt packages (`/tmp/dm-class-lifecycle-afghan.log`). The full 104-table UI/export audit passed (`/tmp/dm-class-lifecycle-ui.log`), including scope-marker regression. Core and shell TypeScript checks, strict locale/mobile parity, hosted-service coverage (23 workers) and whitespace checks passed. Backend packages rebuilt/installed and API built (`/tmp/dm-class-lifecycle-final-dotnet-sync.log`); SPA packages rebuilt/installed (`/tmp/dm-class-lifecycle-spa-sync.log`) and installed helper/component hashes match Core output. Tests used only owned private socket PostgreSQL clusters; no user server was restarted or live database used. Restart API and SPA to load the changes. No migration is required.

Terminal parent/child teardown runs even if notification delivery exhausts its
invocation deadline. Some recipients may miss that terminal frame; generation
checks and cleanup still prevent stale writes, and no automatic mutation retry
is performed. A delivery failure does not roll back an accepted end intent.


### Cross-host notification transport (twenty-fifth implementation increment)

Core AddNotificationBackplane wires Microsoft's .NET 8 SignalR Redis lifetime manager to NotificationHub only. The API invokes the shared registration; country modules do not fork it. Existing school/role/account+stamp and impersonator+stamp groups, current staff message grants, bounded destination pages and delivery gates remain authoritative. ClassHub deliberately retains its default lifetime manager because its state is still host-owned; a transport backplane alone does not supply shared room membership, epochs or histories. The overall scale-out requirement remains incomplete.

Configuration is opt-in (NotificationBackplane Enabled, ConnectionString, ChannelPrefix, TimeoutMs). Local/default mode has no Redis dependency. Enabled mode requires a valid endpoint, explicit 1–64-character deployment namespace and 100–10000ms timeouts (default2000). One host-owned multiplexer serves both the official lifetime manager and a ready-tagged health check. Disconnected backlog is fail-fast, no local fallback occurs, and failed readiness exposes no provider/credential details. This is pub/sub: an outage loses transient events rather than silently queueing old notifications; persisted inbox records are unchanged. No durable delivery outbox or exactly-once receipt claim is made.

Independent Kestrel/JWT hosts and a real private Redis process verify remote notification delivery from a single publisher, deployment-prefix and school isolation, unsubscribe, target/root stamp revocation, fresh sessions, publisher restart, outage readiness and no local fallback, recovery with no old-event replay, and startup with Redis unavailable followed by recovery without rebuilding the host. Recovery assertions capture intervening events rather than discarding nonmatching frames. Default/local and invalid-configuration tests verify dependency-free local routing and sanitized validation errors. The Core harness owns each Redis Unix socket/process/directory, disables TCP/persistence and verifies process exit before cleanup; no user Redis or live PostgreSQL is used.

Production requires an authenticated restricted Redis endpoint near the API hosts, a common prefix per deployment, and proxy affinity unless every client skips negotiation and uses WebSockets. See [Microsoft backplane guidance](https://learn.microsoft.com/en-us/aspnet/core/signalr/redis-backplane?view=aspnetcore-8.0) and [hosting requirements](https://learn.microsoft.com/en-us/aspnet/core/signalr/scale?view=aspnetcore-8.0). No production service was provisioned, configured or started. Full classroom shared authority, remaining job/editor/invariant/query/output/load audits and all seven top-level completion requirements remain open.

Integrated validation: Core 226 passed / zero skipped (`/tmp/dm-notification-backplane-final-core3.log`); Afghanistan 103 passed / zero skipped against installed packages (`/tmp/dm-notification-backplane-afghan.log`). Shared backend/country packages rebuilt and installed and API built (`/tmp/dm-notification-backplane-final-sync.log`). Strict locale/mobile parity, all 23 worker health registrations, shell syntax and whitespace checks passed. No frontend contract, migration or production Redis setting changed. The existing group-deadline regression now warms authorization and uses the production two-second budget with a probe that must receive cancellation, avoiding a cold-start failure before the probe is entered; production limits were not relaxed. Private Redis directories were verified reclaimed after tests. Restart API to load the package swap; user servers were not restarted. All seven completion requirements remain open.


### Shared grade-cell writes and academic-record audit (twenty-sixth implementation increment)

The [academic record audit](../digitalmaktab-core/docs/ACADEMIC-RECORD-WRITES.md) inventories the existing form, workbook, appeal, archive, daily attendance and lesson-evidence writers. Attendance and grade domain tables are reused. Core GradeWriteService now coordinates form and workbook writes by the same natural (enrollment, course, exam-component) key, ordering signed PostgreSQL advisory lock hashes rather than holding a process dictionary or global school gate. Current school/teacher/course/enrollment/student status and exact class/year provenance are checked after waiting. Two IDs individually belonging to a school no longer imply a valid student/course pair. Grade rows are fetched by one JSON recordset join, locked and reloaded. Form batches reject repeated keys, invalid scores/comments and more than 300 cells; bodies are capped at 128 KiB. This is current Core MID_TERM/FINAL component policy, not a new country examination model.

Form grades and first-post inbox notices now commit together through existing StageMany membership/preference checks. Publication occurs after commit. Workbook rows reuse the same writer with current course/class/year lookup, defined enum/score validation, cancellation and sanitized row errors; clearing failed tracked changes prevents a rolled-back row from leaking into the next valid row's SaveChanges. The workbook retains its documented per-row success contract; this does not claim whole-file atomicity, bounded ZIP parsing or upload replay.

Appeal proposals acquire the same cell lock and current grade, blocking concurrent duplicate pending proposals among current writers. Decisions lock the appeal and grade cell, recheck current course-teacher/leader authority, validate revised score against the grade component and commit decision+score together. Concurrent decisions have one winner. Appeal listing uses actual course-teacher authority, scoped course/enrollment/student provenance, no tracking, cancellation and deterministic ties. Legacy duplicate/archived grade keys and duplicate pending appeals are rejected for explicit review, never silently overwritten or resolved by a guessed winner.

GradeCellLookup adds a non-unique composite lookup index with matching runtime/snapshot metadata and a reversible preservation-tested migration. It is deliberately not advertised as database uniqueness: legacy duplicate rows remain intact, and old writers/arbitrary SQL can bypass application advisory locks. Coordinated writer rollout is required. Current serialized edits still use last-writer-wins semantics; expected grade/appeal versions, durable request receipts and UI comparison/reload are unfinished. Reference/withdrawal races through commit, attendance daily-key/date/ownership reconciliation, wider constraints/query/output/jobs/load evidence and all seven top-level requirements remain open. A focused correctness pass is not full concurrency completion.

Integrated validation: Core 235 passed / zero skipped (`/tmp/dm-grade-writes-final-core2.log`), including nine new grade cases; final transfer-privacy regression passed after making its assertion compatible with future controlled rollback (`/tmp/dm-grade-writes-transfer-final.log`). The existing request-capacity and grade suites also passed together (14 tests, `/tmp/dm-grade-writes-final-focused.log`). Afghanistan 103 passed / zero skipped against rebuilt packages (`/tmp/dm-grade-writes-committed-afghan.log`). Shared backend/country packages rebuilt and installed and API built (`/tmp/dm-grade-writes-committed-sync.log`); strict locale/mobile parity, hosted-service coverage, shell syntax and whitespace checks passed. No frontend/API payload contract changed, no user server was restarted and no live user database was used. Restart API to load packages and apply GradeCellLookup through the coordinated migration rollout. All seven original completion requirements remain open.

Grade form batches now use Core ExpensiveOperation admission, as workbook
imports already do. The existing default is two expensive calls per host and
one per school, without a queue, preserving ordinary request capacity. Include
advisory-lock and connection budgets across all replicas in deployment sizing.
Unchanged existing marks skip metadata updates and duplicate first-post notices.

Inbox staging also rechecks the original school's enrollment/student scope and
filters parent reads to that school. A transfer injected after grade persistence
but before staging must not route notices into another school. That privacy test
allows a future implementation to reject/roll back the grade; it does not freeze
the known unfinished reference/withdrawal concurrency behavior as a contract.

Final installation check: Core's pre-commit hook rebuilt Release after the initial
pack, changing build provenance metadata. Packages were rebuilt from committed
source, the API build and 103 country tests passed again, and the installed
Core DLL now matches the final Release checksum. No user server was restarted.


### Observed grade/appeal versions and shared review (twenty-seventh implementation increment)

Core Grade and GradeAppeal reuse IRevisionedRecord and EF concurrency tokens.
AcademicRecordRevisions backfills unique row UUIDs without rewriting marks,
comments or decisions. Existing-cell writes require their observed token (428
missing, 409 stale); absent cells require null, preventing stale recreation.
All batch preconditions are validated before changes, and AddGrades returns
accepted values/versions. No-op saves keep their version. Proposal ownership
and decision authority precede version responses; decisions require both appeal
and grade versions even for uphold. Direct tracked writers rotate versions and
outdated EF saves fail. Existing natural-key locks and transactional inbox staging
remain in place; this does not supply durable replay or database uniqueness.

Fresh scoped workbook templates contain existing marks with a hidden Revision
column. Edit populated rows; new marks start with blank rows instead of copying
another mark's version. Stale/missing offline tokens cannot overwrite current
marks. Template output is capped at 5,000 marks and uses expensive-operation
admission. Teacher grade reads now apply course and exam filters before paging,
plus teacher/school/exact class/year scope, no tracking and stable ordering.
Private grade/review responses use no-store. Whole workbook ZIP/parsing bounds,
durable import intent and through-commit reference/withdrawal coordination remain.

SPA Core owns shared appeal proposal/decision forms and controlled-table conflict
comparison on existing controls. The shell's duplicate forms were removed. Typed
marks/reasons/notes survive rejection, canceled comparison, failed reads and locale
changes. Only explicit use-saved replaces draft values and versions; it never
submits. Accepted versions become the next edit's baseline. Pending actions guard
double submissions, mounted/resource checks ignore late completions, reads cancel,
and grade helpers synchronously pin the original account and bypass private offline
fallback. No automatic mutation retries. Validation agrees with current exam maxima
and backend 1,000-character appeal limits; en/fa/ps and mobile mirrors are aligned.

Validation: Core 241 passed / zero skipped (`/tmp/dm-grade-versions-final-core3.log`),
including full-batch stale-version races, EF predicate enforcement, offline workbook
updates, proposal/decision expectations, authorization precedence, migration
preservation/parity and repository course/exam scope. Afghanistan 103 passed / zero
skipped against installed packages (`/tmp/dm-grade-versions-final-afghan.log`). Full
104-site UI/export audit passed (`/tmp/dm-grade-versions-final-ui.log`), including
actual controlled grade editors and Core appeal forms in all locales, explicit
review/cancel, no autosave/retry, accepted baselines, late unmount and locale draft
retention. Existing profile conflict tests remain green after comparison reuse.
Core/shell TypeScript, strict i18n/mobile parity, all 23 worker registrations,
shell syntax and whitespace checks passed. The notification backplane fixture now
owns a separate database so unrelated migration/index tests do not race it; the
recurring fixture supplies explicit GradeAppeal versions like production writers.

Backend and SPA packages rebuilt/installed; API built; installed Core Release DLL
and shared JS files match built checksums. Mobile country package built/packed and
its translation files verified in both local consumers. Local commits only; no
user servers restarted and no live user database used. Coordinate migration and
API/SPA restart with old writers stopped, then reload open editors and download
fresh workbooks. No production capacity claim follows from these checks. Grade
receipts, attendance, wider editor/invariant/query/output audits, shared classroom
state/jobs and representative load evidence remain; all seven top-level requirements
stay unchecked and the full goal remains active.


### Shared daily attendance writer and civil dates (twenty-eighth implementation increment)

The academic-record audit identified a selected-date loss in manual roll call,
missing import teacher ownership and independent duplicate-prone creation paths.
Core DailyAttendanceWriter now coordinates manual entry, workbook rows, explicit
operator fill-missing and teaching-lesson daily creation using the existing
Attendance table. PostgreSQL advisory keys are enrollment plus invariant-culture
civil date, ordered by actual signed hash. Existing daily rows are locked/reloaded;
legacy duplicate history requires review instead of a guessed winner. Lesson
operations retain school-before-daily lock order and their own evidence/version/
request contract, recheck the roster after waiting, and never overwrite the first
daily roll call. No country policy or competing attendance domain was added.

Manual AddAttendance requires Date as yyyy-MM-dd and saves that school-local day,
not server DateTime.Now. Existing school/year plan timezone supplies half-open UTC
bounds through SchoolLocalTime; absent active plans use UTC. Nonexistent/future
civil dates and dates outside configured year bounds reject. New rows use an
instant inside the actual day; edits preserve original timestamps. The existing
active-year summary supplies school-local Today for the form, and the workbook
sample date uses the same rule. Teacher reads apply school/student/class/year and
homeroom scope, local-day range, no tracking and stable paging, with no-store.
Manual batches are atomic, capped at 300 students/64 KiB and heavy-operation
admitted; authorization/current active roster are checked after lock waits.

Attendance workbook imports now resolve only the caller's active homeroom roster,
reject ambiguous school/year Asas matches, parse invariant ISO text or native
spreadsheet dates, and use the shared writer per row. Cancellation propagates;
failed/successful row contexts are cleared before another row, preventing leaked
rolled-back work. Request size is 8 MiB and at most 1,000 rows are processed.
These are partial resource bounds: compressed ZIP expansion/full synchronous
workbook parsing still need explicit limits. Existing row-success reporting is
preserved; expected offline edit versions and durable upload intent remain open.

Explicit fill-missing uses native UUID pages of 200 active enrollments. Each
checkpoint takes shared daily locks, rechecks school/operator attendance.write
grants and the roster, and skips every existing mark (including absence and
ambiguous legacy cells). Checkpoints commit independently; canceled/failed later
pages may leave accepted earlier pages. Empty unattended actors remain no-op and
never fabricate presence. Core reuses its existing operator audience/capability
query rather than a new role model. This does not finish background job scale-out
or supply a durable full-day action receipt.

AttendanceDailyLookup adds a non-unique enrollment/timestamp index with matching
runtime/snapshot metadata. Down/up preserves existing records; a selective
8,000-row EXPLAIN ANALYZE regression selects it without disabling sequential
scans. This is a single-query correctness/plan check, not representative whole-app
load evidence. Uniqueness and reference/withdrawal/timezone changes through commit
remain unresolved. Other attendance readers/aggregates still need their wider
calendar, paging and query audit.

The actual teacher screen and shared API/hook now send the selected civil date,
pin the original account, cancel abandoned reads, clear old rows when changing
scope and prevent duplicate clicks/edits while saving. UTC timestamp prefixes no
longer decide school-day membership. Cache and new offline queue keys include
immutable role/school/account; queued commands include their original date and
cannot replay under another login. Authoritative HTTP failures do not fall back
to cached rosters. Unknown online outcomes are never silently queued as new
writes. Legacy unscoped queues are retained but cannot safely be attributed or
automatically replayed; review/resubmit before rollout. Existing explicit offline
reconnect behavior still lacks expected versions/durable receipts, and serialized
manual corrections remain last-writer-wins. Those are required follow-up work,
not covered by daily-key serialization.

Validation: full Core 251 passed / zero skipped (`/tmp/dm-attendance-final-core.log`),
then final attendance/lesson HTTP/template and shared-writer regressions 14 passed
(`/tmp/dm-attendance-final-focused-core.log`). Tests cover independent concurrent
writers/cultures, day preservation, batch authorization, canceled waits, duplicate
history, create-only lesson evidence, import ownership/ambiguity/culture/native
dates, concurrent 207-student checkpoint fill, local range reads, index rollback/
plan behavior and short/long/skipped dates. Afghanistan 103 passed / zero skipped
against installed packages (`/tmp/dm-attendance-final-afghan.log`). Full 104-table
UI/export audit passed (`/tmp/dm-attendance-full-ui.log`); final real attendance
screen checks in en/fa/ps passed after later scope/default-day refinements
(`/tmp/dm-attendance-final2-focused-ui.log`), including denial without cache fallback,
original-account/date retention, double-submit guards and no unknown-outcome queue.
Core/shell TypeScript, strict i18n/mobile parity, worker health registration,
shell syntax, component reuse and whitespace checks passed. Existing toggle border
styles no longer produce conflicting shorthand warnings during status changes.

Core/API/SPA packages rebuilt and installed; API built; installed Core Release DLL
and shared JS/types match built checksums. Local commits only. No live user DB,
production service or user-owned server was changed/restarted. Stop old writers,
coordinate the new API/SPA contract plus index migration, restart both servers and
reload open attendance editors. Expected attendance versions/receipts, broader
invariants/read/output audits, shared classroom authority/jobs and representative
load evidence remain. All seven original completion requirements stay unchecked;
the goal remains active.


### Attendance versions, durable intent and offline review (twenty-ninth implementation increment)

Attendance now reuses IRevisionedRecord and shared RecordVersions validation.
AttendanceRecordRevisions backfills distinct UUIDs without changing IDs, statuses,
dates, actors or duplicate history. Existing-cell writes, including no-op choices,
require the version originally read (canonical 428 missing / 409 stale); new
cells require null. Every batch precondition is checked before mutation, and EF
predicates also protect direct tracked writers. Create-only lesson/fill paths
preserve existing marks. Grade's existing public checker delegates to the same
Core guard; no country fork or competing attendance domain was introduced.

Manual commands require recorded CalendarYearId and civil Date plus the existing
Idempotency-Key header. Core reuses MutationReceiptStore with normalized enrollment
order, school/actor/role/action scope, payload fingerprints and encrypted accepted
marks/versions. Receipt and database effects commit together. Replaying an accepted
request never reapplies its choice over a newer mark; changed details under a
completed ID reject. Current homeroom ownership is checked before and after waiting
on the receipt lock, including replay, and after daily waits for mutations. The
generic receipt helper's optional authorizer supplies that after-wait check while
preserving existing callers. Resolved draft/closed year plans reject new daily
writes; an already-accepted request can replay after closure. Through-commit
reference/timezone/lifecycle coordination and receipt storage/retention remain open.

Teacher snapshot reads accept the recorded year and require current homeroom
class authority. Scoped day/class workbook downloads include saved marks with
hidden revisions (up to 1,000 rows). Examples moved to Reference and cannot become
an imported fake student's attendance. Imports use observed tokens and reject
stale old copies. Per-row success remains independent; whole-upload durable intent
and full ZIP/parsing resource limits are still unfinished. Explicit school-wide
fill also still needs its full-day intent/partial-checkpoint contract audit.

SPA Core owns reusable snapshots, acknowledgement validation and pending-draft
review; shell roll call consumes them. Accepted versions become the next baseline.
Rejected writes, failed/canceled review and locale changes preserve entered choices
and expected tokens. Explicit comparison loads saved values without submitting.
Background acknowledgements never reset a newer typed form or silently refresh its
version. Unknown online outcomes retain the same request intent for an explicit
retry, instead of becoming a new queued operation. New offline drafts persist the
original request ID/year/date/versions; reconnect or Send saved request reuses them.
Conflicting drafts remain visible with comparison and confirmed local discard.
Legacy entries lacking verified metadata remain stored and cannot auto-send.
Core/country/mobile en/fa/ps strings mirror the new shared controls.

The existing IndexedDB queue upgrades in place and atomically deduplicates known
intents. It rejects changed payloads under a queued ID, caps payloads at 128 KiB,
each kind at 100 entries and the store at 1,000. Kind indexes avoid reading other
accounts' drafts. Scoped deletion and retry counters share readwrite transactions,
preventing a retry from resurrecting a discarded row. Drains stop on failure and
recheck later rows before sending, so a discarded later draft is not replayed.
The hook flush is single-flight and queue changes refresh its counts/list. A
blocked upgrade has a bounded caller wait and one retained opening/wait state,
with explicit close-old-tabs recovery. A real browser exercises blocked upgrade,
legacy preservation, recovery, concurrent deduplication, quotas, scope separation,
failure ordering, later discard and retry/delete races. The harness owns its
Chrome profile/process group and verifies exit before deleting it. Initial cleanup
racing helper shutdown was corrected; the earlier owned failure directory was
reclaimed after verifying no matching browser process remained.

Validation: Core 255 passed / zero skipped (`/tmp/dm-attendance-versions-final-core.log`),
including two real JWT API hosts with shared keys, one durable outcome/eight
acknowledgements, no replay over later edits, stale whole-batch rejection, changed
fingerprints, closed-year replay/new-write behavior and revocation injected while
a receipt request waits. Migration rollback/reapply preserves marks and token
metadata; stale tracked EF writes and offline workbook copies reject. Full
104-table UI/export audit passed (`/tmp/dm-attendance-versions-final-ui.log`),
including real shared comparison forms after the optional open-on-activation
extension. Final actual attendance editor and pending-draft tests passed in all
three languages (`/tmp/dm-attendance-versions-ui5.log`), including frozen tokens,
explicit retry IDs, locale retention, canceled/confirmed comparison, legacy draft
confirmation and background acknowledgements preserving newer choices. Real
IndexedDB/browser checks passed (`/tmp/dm-attendance-versions-queue-browser4.log`).
Strict i18n/mobile parity, TypeScript, hosted-service coverage, component reuse,
shell syntax and whitespace checks passed. These are correctness/boundedness
checks, not representative throughput measurements or complete goal sign-off.

Backend/SPA packages rebuilt and installed, API built, Core Release DLL and
installed JS/types checksums matched. Mobile country translations built/packed
and verified in both consumers. Afghanistan regression and final repository
status evidence follow below. Local commits only; no live user database, user
server or production service was modified/restarted. Coordinate the migration
and API/SPA contract, retire old writers, restart both servers and reload editors.
All seven original completion requirements remain unchecked; broader writers,
constraints/query/output audits, shared classroom authority/jobs and representative
multi-school load evidence are still required.


Final country integration: Afghanistan 103 passed / zero skipped against the
installed Core packages (`/tmp/dm-attendance-versions-final-afghan.log`). Installed
Core Release SHA-256 b787c11555e63f1da8c3debc25ecde07c7925096b2e294d348156c4256cb7c76
matches the committed-source build. Shared attendance/queue JS and both mobile
locale installations match built artifacts. All affected code/country/mobile
repositories are clean after local commits; root evidence is committed last.
No live user database or user-owned server was used or restarted. The full goal
is not achieved: every original top-level completion requirement stays open.

### Bounded workbook ingress (thirtieth implementation increment)

All five existing Core import services now use `BoundedWorkbook.LoadAsync` before
import domain queries or writes. The shared loader caps actual input at 8 MiB,
archive entries at 128, actual expansion at 16 MiB per part / 32 MiB total,
worksheets at eight, used cells at 100,000 and used columns at 128. People and
attendance accept at most 1,000 data rows; grades accept 5,000. XML depth, node,
style, string, range-area and styled-column budgets precede ClosedXML allocation.
Decoded text is bounded again after loading, including shared-string fan-out.
Reject malformed/aliased packages, formulas, unsupported rich workbook metadata,
large sparse extents and shifted data origins. Preserve caller stream ownership
and cancellation; never orphan synchronous model construction on a timeout task.
These are structural budgets, not exact heap/CPU or throughput guarantees.

Existing BaseController import handling supplies localized, no-store 400/413
problems in en/fa/ps. All five endpoints retain expensive-operation admission and
matching upload limits. Unexpected person-row errors no longer leak provider
messages; canceled/failed tracked changes are cleared. Student capacity waits now
receive the same cancellation token. Reference-course template output is capped
separately. See Core `docs/WORKBOOK-IMPORT-LIMITS.md` for the full contract.

Validation after resuming: the complete isolated Core suite passed 281 tests,
zero skipped (`/tmp/dm-workbook-throttle-diagnostic.log`), including adversarial
archives, actual generated templates, all five real JWT HTTP import endpoints
in all three locales, rejection before account writes and ingress metadata.
Strict frontend/backend and mobile locale parity, shell syntax and whitespace
checks passed. Core implementation committed locally as `f9ad1f4`; final consumer
package/country checks are recorded below.

An earlier full run failed one shared-throttle first-allocation test (280 passed,
zero skipped, `/tmp/dm-workbook-resumed-core.log`), reproducing an intermittent
failure from before the pause. The diagnostic run passed without increasing any
production deadline or weakening fail-closed behavior. Internal exceptions now
retain the underlying cause; HTTP failure responses remain generic. The cause
of that intermittent failure is NOT established and remains follow-up work.
The separate 500 ms lock-timeout assertions remain; unrelated progress checks
use the existing production budget. Do not present a green retry as its repair.

Intervening user-reported repairs are committed separately: startup inventory FK
compatibility and throttle seed SQL types; Student physical column-slot exhaustion
caused by recurring add/drop repairs (backed-up local maintenance preserved all
516 students and references); and civil student birth-date persistence in Core.
Those emergency fixes used explicit local maintenance; this import increment's
validation itself uses isolated databases and does not restart user servers.

The next import audit must reuse `AccountRegistrationService`,
`MutationReceiptStore` and `AccountWelcomeQueue`: teacher/parent import rows still
commit an account before calling legacy welcome delivery, so a delivery failure
can misreport a committed row. Student imports also use the old welcome path.
Whole-upload/per-row durable intent, result/password recovery, atomic country
extensions, wider reference/template/output bounds and registration cancellation
remain unfinished. No duplicate job/account/country tables are justified by this
loader. All seven top-level completion requirements remain open, as do shared
classroom authority, the wider job/invariant/query audits and representative
multi-school load/recovery measurements.

Final thirtieth-increment consumer checks: backend pack/install and API build
passed (`/tmp/dm-workbook-resumed-sync.log`); Afghanistan 103 passed, zero skipped
against the installed Core (`/tmp/dm-workbook-resumed-afghan.log`). Core Release
and API-installed DLL SHA-256 both equal
`6429225b0faf02542f85c54b589835d551dbcd22eb4acc55eb10c3f43b5338cf`.
API documentation committed locally as `272a975`; strict locale/mobile checks
passed (`/tmp/dm-workbook-resumed-i18n.log`, `/tmp/dm-workbook-resumed-mobile.log`).
No user server was restarted for this package installation. Restart the API to
load the installed package. No production capacity or full-goal completion claim
follows from these tests.

### Atomic import welcome intent (thirty-first implementation increment)

User requested a pause until 02:05 Europe/Vienna on 25 October 2027 (one minute
past the stated reset). No suitable goal-resumption scheduling tool is exposed;
do not claim that an automatic resume was scheduled.

Core changes initially checkpointed at the pause reuse AccountWelcomeQueue for student/teacher/
parent import rows. Each account and encrypted welcome intent share a row
transaction; student placement/enrollment remain in that transaction too. Imports
no longer call mail transports synchronously. AccountRegistrationService exposes
its existing normalized email advisory lock for import reuse, before capacity
locks, with a duplicate check after waiting. Existing result/partial-row behavior
remains. No schema, duplicate entity or UI contract added. Whole-upload/per-row
receipt intent and durable generated-password/result replay are NOT implemented.

Private tests now cover queue-staging failure rollback followed by a successful
row for all three account types, preserved student enrollment, encrypted queued
credentials, unavailable provider retry without changing committed accounts, and
two independent importer contexts racing the same email. A shared-fixture test
initially dispatched another fixture's outbox encrypted with another ephemeral
key; fixture scheduling now isolates that probe without deleting history.

Full Core suite: 283 passed, zero skipped
(`/tmp/dm-import-welcome-isolated-final-core.log`). Diagnostics captured the old
intermittent throttle failure as its two-second cancellation expiring before a
cleanup command could execute (`/tmp/dm-import-welcome-final-core.log`). The
wall-clock deadline fixture now runs separately from unrelated adversarial
compression/parser allocations; internal host/DB races stay concurrent, and no
production deadline was increased. This is test isolation, not production load
or latency assurance. Keep broader real-load diagnosis open.

Resume by reviewing the uncommitted work, committing Core locally, then running
sync-dotnet.sh, Afghanistan regression, installed-DLL checksum, API/docs updates
and final root evidence/commits. Core's pre-commit Release build must precede the
final package swap. No package installation/server restart/user database change
was performed for this in-progress increment. All original goal workstreams
remain open; finish this carryover before beginning durable row/upload replay.


Carryover completion after the user resumed on 2026-10-25: reviewed and committed
Core as `a168782`; backend packages rebuilt/installed and API built successfully
(`/tmp/dm-import-mail-sync.log`). Afghanistan regression: 103 passed, zero skipped
(`/tmp/dm-import-mail-afghan.log`). Installed Core and final Release SHA-256:
`603b2844a1bf52858df1fcb298e5c9bd20383be74e857430e861dd1aa134ac08`.
Strict locale checks passed (`/tmp/dm-import-mail-i18n.log`). Core/import integration
covered by the 283-pass full suite cited above. API documentation is committed
locally; final root evidence commit follows. No user server was restarted and no
user database was modified for this increment. All seven original workstreams
remain open, including durable upload/row replay and production load diagnosis.

Durable-import discovery: BulkImportModal currently accepts only a File, has no
mutation intent or original-account pin, and discards local state on close. The
three account API upload helpers do not send Idempotency-Key. Grade/attendance
helpers already accept ApiRequestOptions but do not provide durable upload intent.
Do not retry a changed file under the same intent or invent another account/job
model. Reuse MutationReceiptStore for a file-hash manifest and independently
committed row outcomes, with encrypted credentials; retain row-level partial
success and reject changed input before any further rows run. Scope row IDs by
original actor/role/school, upload intent, kind and row. Pin the selected year
from the first accepted manifest so a later login-year change cannot redirect a
retry. Replay must precede current email/capacity/reference checks. Coordinate
this backend contract with the Core modal/useMutationIntent/API helpers and test
unknown outcomes, concurrent hosts, cancellation, identity changes and recovery.

### Durable person-import intent and result recovery (thirty-second increment)

Student, teacher and parent uploads now require Idempotency-Key. Core's shared
WorkbookImportReplay uses the existing MutationReceiptStore and encrypted response
columns: a manifest binds exact bounded-file SHA-256 to the actor/role/school,
import kind and request ID, and pins the first accepted student academic year.
Per-row operation keys under the same intent retain independently committed row
outcomes and credentials. There is no new job/account/outbox table or duplicate
storage of source files. Completed rows replay before current duplicate, capacity
or reference checks; validation skips are recorded, while unexpected failed rows
roll back and may run on explicit retry. Earlier rows survive later failure or
cancellation. The shared Rows pipeline aggregates results and clears tracked
state instead of copying this workflow into each adapter. Transient database
errors stop later attempts with localized no-store 503/Retry-After; no mutation
is automatically retried. Changed files under an accepted ID return 409, missing
IDs 428, and unreadable replay keys 503 without re-executing accepted work.

The controller passes current request authority, not client-supplied actor fields.
After receipt waits, every manifest/row read rechecks current account stamp,
impersonator stamp and staff import grants before decrypting saved credentials.
This does not assert through-commit authorization coordination or resolve the
wider role/target privilege audit. Country import hooks and legacy country-shaped
student template fields still need the composition audit; existing Core DTOs,
entities and module extensions must be reused rather than mirrored.

Core BulkImportModal/useMutationIntent/API helpers retain stable request IDs with
file metadata per immutable account/import kind, without persisting bytes,
passwords or response bodies. Metadata is only a recovery hint: the server hashes
actual bytes. Reselecting the original unchanged file after remount recovers its
accepted row results. Failed/closed uploads retain the current file/intent;
selecting another file explicitly starts another operation. Storage failures or
corruption stop an upload rather than silently replacing an unknown intent.
Requests pin account tokens, double clicks are single-flight, token renewal and
locale changes preserve intent, and abandoned/account-switched results cannot
reveal credentials. This is not a full import-history browser or durable source
file archive: only the last file metadata/intent per account/kind is retained.
Grade/attendance helpers forward the shared options but their durable upload
outcomes remain unfinished; their existing version contracts are unchanged.

Validation: full private PostgreSQL Core suite 287 passed, zero skipped
(`/tmp/dm-import-replay-final-core.log`). Covers eight independent contexts with
one accepted row and original credentials, partial failure/cancellation and later
recovery, key loss, stamp revocation, exact file hash, row bounds and transient
DB fail-fast. Real JWT HTTP tests use two independent Kestrel hosts and all three
person import endpoints: missing keys, concurrent replay, changed-file rejection,
private/no-store responses, replay after class closure/active-year change and
locale change, one account/welcome intent per accepted row. Final targeted source
and HTTP checks passed (`/tmp/dm-import-replay-final-http.log`,
`/tmp/dm-import-replay-shared-pipeline.log`). These are correctness checks, not a
representative latency or supported-user-count measurement.

Actual Core modal/API tests pass in en/fa/ps (`scripts/tests/import-recovery.cjs`,
`/tmp/dm-import-replay-ui-tests.log`), including failure, close/reopen, remount,
reselection, token renewal, duplicate clicks, account switching and safe storage.
The test is part of the complete 104-table UI/export audit, which passed
(`/tmp/dm-import-replay-full-ui.log`). Strict locale/mobile parity, Core component
reuse and TypeScript passed. No additional record/table/date UI was introduced.

Local commits: Core `382f7cd`, SPA Core `b879f40`, Afghanistan SPA translations
`81eaabf`, mobile translations `f077725`, API host/docs `f164e7a`. Backend and SPA
packages were rebuilt/installed (`/tmp/dm-import-replay-release-dotnet.log`,
`/tmp/dm-import-replay-release-spa.log`). Mobile country built/packed through its
existing script and installed in both consumers; source/dist locale checksums
match. Core Release and API-installed DLL SHA-256 both equal
`087a7c47d170edd0f599f48b741c882654b4d2cb5b658ae0ba5f9f4212b8e1e5`.
Installed SPA modal/intent/options JS matches the built artifacts. Afghanistan
regression 103 passed, zero skipped (`/tmp/dm-import-replay-release-afghan.log`);
shell TypeScript passed (`/tmp/dm-import-replay-release-shell-tsc.log`). No live
user database was modified and no user server was manually restarted. Restart
API and SPA together to load the coordinated import contract; old clients get
428 rather than bypassing receipt protection.

All seven original goal requirements remain open. Next work includes durable
attendance/grade upload outcomes, country import composition, remaining important
writers/editors, invariants/query/output audits, shared classroom authority/jobs
and representative multi-school load/recovery evidence. Do not mark the full
objective complete from this focused import milestone.


### Durable academic workbook recovery (thirty-third increment)

Grade and attendance uploads now reuse WorkbookImportReplay and the existing
MutationReceiptStore instead of adding an import-job/mark table. All five upload
endpoints require Idempotency-Key. Exact-file manifests pin the original year;
independent row receipts retain committed outcomes. GradeWriteService explicitly
joins the receipt transaction for imports while ordinary form batches retain
clean transaction ownership; DailyAttendanceWriter already supports its caller's
transaction. Existing natural-cell locks, reference checks and observed revisions
still govern new writes. Mark and encrypted row receipt commit together. A receipt
insertion failure after saving a mark rolls that mark back and leaves the original
intent retryable, preserving earlier completed rows.

ImportResultDto extends its existing encrypted row outcome with the accepted mark's
immutable ID. Aggregate HTTP reports omit that internal provenance. Core's typed
replay authorization hook rechecks the current original grade/course teacher or
attendance enrollment/homeroom, school and pinned year before returning the saved
outcome. Mutable Asas numbers and a newly active academic year cannot redirect a
retry. Recovering an accepted outcome preserves later form corrections and rejects
reassigned records. Account/security-stamp checks still run after receipt waits
before decryption. These point-in-transaction checks do not establish through-commit
coordination with every unrelated reference/timezone/lifecycle writer.

Expected writer-domain/version exceptions roll back/report a localized row skip,
while returned validation outcomes are recorded. Transient DB failures stop the
remaining upload. A new intent still requires current versions, and no mutation
is automatically retried. Known completed results now expose a Core AppButton to
explicitly start another operation with the same file: persist a new ID before
clearing the result, never upload automatically. Unknown outcomes retain their
original ID and do not expose this action. Shared metadata-only recovery, original
account binding, single-flight submission and stale-callback suppression remain.
New labels ship in en/fa/ps and all mirrored mobile bundles.

Validation: full isolated PostgreSQL Core suite 289 passed, zero skipped
(`/tmp/dm-academic-full-core.log`). Real JWT/two-host HTTP coverage includes both
academic upload endpoints, six concurrent submissions, one mark, missing keys,
changed-file rejection, private/no-store responses, later form corrections,
new-intent version rejection, changed Asas numbers, renewed active-year context
and revoked original ownership. Failure injection at row receipt insertion proves
mark rollback and same-intent recovery without duplicate marks. Existing domain,
version, row-partial-success and shared receipt tests remain passing.

All five actual shared modal/API adapters pass in three languages, including the
explicit fresh-intent action after a known response and retained intent after an
unknown response (`scripts/tests/import-recovery.cjs`, `/tmp/dm-academic-ui.log`).
The full 104-table export/UI audit passed (`/tmp/dm-academic-full-ui.log`). Core and
shell TypeScript, strict locale/mobile parity and precommit component checks passed.
These correctness checks do not measure representative production throughput.

Local commits: Core `bd25233`, SPA Core `86cdcb3`, Afghanistan SPA translations
`cc4158f`, mobile translations `79a1f00`, API docs `4c67e9a`. Backend/SPA packages
rebuilt and installed (`/tmp/dm-academic-release-dotnet.log`,
`/tmp/dm-academic-release-spa.log`); mobile built/packed and installed in both apps.
Core Release/API installed DLL SHA-256 matches:
`c4870d5c9542a1adcbd2e0ce9cf8d738e3b5e709a6adcb917392e0ef15aa423d`.
Installed modal/intent JS and all mobile locale checksums match their builds.
Afghanistan 103 passed, zero skipped (`/tmp/dm-academic-release-afghan.log`);
installed shell TypeScript passed (`/tmp/dm-academic-release-shell-tsc.log`).
No user DB writes or manual user-server restarts. Restart API and SPA together.

All seven original requirements remain open. Next work includes country import
composition and legacy country-shaped template fields, explicit fill recovery,
remaining important writers/editors, invariant/query/output audits, shared
classroom authority/jobs and representative multi-school load/recovery evidence.
Do not mark the goal complete from this workbook milestone.


### Atomic module-aware person imports (thirty-fourth increment)

Discovery found that Core's student import still required Afghan native/English
family chains but discarded those country values; neither student nor teacher
imports invoked the existing extension hooks. The existing Afghan profile DTOs,
entities, validation rules and repository already represented the data. They are
reused, without another table, field, DTO or plugin registry.

Core IStudentExtensionHook/ITeacherExtensionHook now share IPersonExtensionHook
for optional machine columns, enum choices, legacy normalization and import saves.
ModuleApplicability.PersonHooks supplies one matching policy for both form and
import dispatch: country, exact school and enabled-module targeting, with school
hooks after country hooks. Default import callbacks preserve existing upsert-only
hooks. Core's base student template uses universal FirstName/LastName and existing
Core columns. Afghanistan owns its native/English family chains, MotherTongue,
IsOrphan and other existing profile fields. The teacher template now resolves the
actual school and matching hooks asynchronously. Repeated/unsupported columns
reject before row writes instead of being silently overwritten/discarded. Country
DTO identifiers cannot select the server-owned import target. Explicit universal
names win; only the Afghan module recognizes older English/native-only sheets.

Country hooks parse the existing DTOs using AfghanPersonDetailsRules and save
through AfghanPersonDetailsRepository with explicit ambient transaction ownership.
Account, module profile, student enrollment, queued welcome and row receipt commit
together. Standard localized field validation errors report skipped rows after
rollback. Failure after a country save also rolls it back; replay of accepted rows
does not invoke hooks or overwrite later profile edits. Normal standalone repository
calls retain transaction ownership. Their editor versions and broader through-commit
reference/permission coordination remain separate requirements.

Core BoundedWorkbook.CellText normalizes typed Excel civil dates/numeric cells to
invariant machine values; student/teacher birth dates accept ISO yyyy-MM-dd text
or date cells across request locales. Template endpoints use heavy admission and
no-store responses. Student class reference reads are no-tracking, deterministic
and capped at 1,000, with localized 413. Class-scoped reference selection and wider
import lookup/query bounds remain open. Imported teacher welcome records now use
the actual TEACHER/PRINCIPAL/HEAD_MASTER role. New messages use existing per-controller
School resources in en/fa/ps; there are no new frontend controls or locale keys.

Validation: full private PostgreSQL Core suite 291 passed, zero skipped
(`/tmp/dm-country-import-final-core.log`). Applicable module columns/atomic callbacks,
wrong-country/wrong-school exclusion, country-before-school order, unsupported
header rejection, module validation after saved Core writes, independent success,
queued effects and accepted replay are covered. The real Afghan hooks/DTOs/rules/
repository pass for students and teachers in all three locales, including native
names, IDs, employment fields, typed dates, legacy sheets, preserved Core display
names, actual principal welcome roles, retry without duplicate profiles, and Austria
isolation. Injected welcome staging failure after country save leaves no account
or country profile; explicit same-intent recovery succeeds. The harness owns a new
isolated person-import database, never user data. Country parser tests reject
invalid enums/numbers/dates/identifiers and ignore DTO target IDs.

Core `026ca76`, Afghanistan `b8e5a8f` and API docs `1097ea9` are committed locally.
Standard backend sync rebuilt/installed committed packages and built API
(`/tmp/dm-country-import-release-dotnet.log`). All 105 Afghanistan tests passed
against those installed dependencies, zero skipped
(`/tmp/dm-country-import-release-afghan.log`). Strict locale parity, template route
policy checks, shell syntax, whitespace and precommit checks passed. Source builds
and installed API DLL hashes match:

- Core: `641e4549b641a740ce3641ca634812160f68eb950474665bd70b700a354781cc`.
- Abstractions: `974811da268af95ae5a2686c6d1de2c101b49f219cfbe5d8ba4b2fb6e2680cc5`.
- Afghanistan: `292b77c1b6b4a6f94b259bed582eb2ef51dcc84b3748b647d4f8faa23e3303c0`.

No user database was modified and user servers were not manually restarted. Restart
API for the coordinated hook contract; if still on packages from the preceding
modal increment, restart SPA too. No frontend package change in this increment.
These correctness/boundedness checks do not establish whole-app capacity.

All seven original completion requirements remain open. Next work includes
standalone country profile editor concurrency, explicit attendance fill recovery,
remaining important writers/editors, invariant and query/output audits, shared
classroom authority/background jobs and representative multi-school load/recovery
measurements. Keep the original full scope and do not mark complete from this
module-import milestone.


### Shared Core versions for country profiles (thirty-fifth increment)

The standalone Afghan student/teacher profiles had no observed-version contract.
Discovery found existing Core Student/Teacher Revision columns, RecordVersions,
the credential writer's physical account lock, DataContext owned-value revision
tracking and SPA Core's form/conflict comparison. These are extended and reused;
there is no new persistent version column, table or second profile store.

Core IRevisionedExtension exposes an existing tracked aggregate owner. SaveChanges
follows a changed country profile or its owned national identity/address into that
owner and advances the existing Core Revision with its EF predicate. Missing
tracked owners reject rather than silently writing without a version. Owner lookup
and cycle tracking allocate only on extension paths. Metadata edits preserve login
stamps. RecordVersions.LockAccount extracts/reuses the password repository's fixed
role/table, parameterized-ID physical row lock; credential behavior remains covered
by the full Core suite. This helper supplies serialization, not authorization.

Afghan profile DTOs echo the Core revision, including an empty country profile.
PUT requires it: canonical localized no-store 428/409 on missing/stale versions.
The repository checks actual school ownership after waiting, reloads the Core
snapshot, checks RecordVersions and refreshes only a clean matching profile/owned
graph. Existing legacy profile Id/FK differences are preserved; no unrelated
Core/enrollment changes are cleared. Profile and parent version commit together.
Commands cap at 64 KiB and reads are no-store. Create-only upsert/backfill hooks
share the same account lock, recheck existence, preserve current profiles and leave
versions untouched on no-op. They reuse ambient transactions or own one when
needed and forward cancellation. Backfill HTTP actions use heavy admission. Import
hooks supply the newly registered account's observed version; workbook columns
exclude Revision. No spreadsheet field can bypass the version requirement.

SPA Core useVersionedRecordEditor composes existing account identity, request
options and conflict helpers for cancellable, single-flight versioned forms. Both
country editors reuse it and existing AppBaseEditor conflict comparison. Failed
saves/review reads and Keep preserve entered values; saved-value replacement is
explicit. The shared acknowledgedRevision advances a known successful token only
when its submitted baseline still matches, without replacing fields typed while
saving. Locale/token renewal preserves forms; account/resource switches abort and
suppress stale responses. Requests pin credentials; no automatic write retry,
silent rebase, navigation tabs or persistent draft history is introduced. Date
and enum comparison uses existing country calendar/translations, with shared Core
controls. No new locale keys/mobile package changes were required.

Validation: full isolated Core suite 291 passed, zero skipped
(`/tmp/dm-country-versions-core-final.log`). Afghanistan suite 106 passed, zero
skipped (`/tmp/dm-country-versions-af-final.log`). The new test runs two independent
Kestrel hosts with existing test authentication: concurrent country writes accept
one version, stale Core and stale country edits reject in both directions, owned-
only changes advance the Core token without rotating stamps, missing versions
return 428, three-locale conflicts return 409/no-store, foreign school requests
return 404, 100 KiB commands receive 413 and no country Revision property exists
in the EF model. Untracked-owner changes reject. Eight independent backfill
contexts race a country editor, retain one profile and preserve no-op versions.
These HTTP tests do not claim an additional JWT/through-commit permission proof.
Existing report fixtures now observe versions after HTTP backfill/edits rather
than reusing stale tracked Core snapshots.

Actual country forms/shared Core comparison pass in en/fa/ps, including failed
review reads, Keep/Use saved, no automatic save, acknowledged token reuse, newer
typed fields, locale switch without refetch/draft loss, token renewal, duplicate
submission and account-switch abort/suppression
(`/tmp/dm-country-versions-ui-final.log`, `scripts/tests/afghan-details-forms.cjs`).
The complete 104-table UI/export audit passed
(`/tmp/dm-country-versions-full-ui.log`). Core/country/shell TypeScript, strict
locale parity, component reuse, route policy and precommit checks passed. These
correctness tests are not representative production load measurements.

Local commits: Core `6e48b54`, Afghanistan `5156dc9`, SPA Core `e57c415`, Afghanistan
SPA `32a540c`, API docs `ca366ca`. Committed backend/SPA packages were rebuilt and
installed (`/tmp/dm-country-versions-release-dotnet.log`,
`/tmp/dm-country-versions-release-spa.log`). Installed-dependency Afghanistan suite
106 passed, zero skipped (`/tmp/dm-country-versions-release-afghan.log`); installed
shell TypeScript passed (`/tmp/dm-country-versions-shell-tsc.log`). Built and API
installed DLL hashes match:

- Core: `bd72d417c2c83efc80e4358a0500102f85ed293b3ec306a0dd81ec4c4d3e3697`.
- Abstractions: `a91dd43b4a9fd962f0c19c43dabb8b4bfdf1fbe5dd8db75508b05a197fe02a4c`.
- Afghanistan: `00218df70f3aa22d75147593347e516d2b8c37001fddc9f0faf0b2fa073e4f70`.

Installed Core hook/BaseEditor and both country editor JS match the builds. No
user database changes or manual user-server restarts. Restart API and SPA together
for the updated edit contract. There is no schema migration for this increment.

All seven original completion requirements remain open. Next work includes
explicit attendance fill recovery, remaining important writers/editors,
through-commit reference/permission coordination, invariant and query/output
audits, shared classroom authority/background jobs and representative multi-school
load/recovery measurements. Do not equate these profile tests with whole-goal
completion or shrink the original scope.


### Explicit attendance fill recovery (thirty-sixth increment)

Discovery found an existing explicit operator fill route, 200-row checkpoints,
shared DailyAttendanceWriter and encrypted MutationReceiptStore, but no durable
original-day/roster/outcome contract. These are extended; no new database table,
persistent field, roster copy or UI component is introduced. A nonpersistent
result DTO acknowledges original counts/day/year; action options supply missing
input/time budgets while existing RequestCapacity owns heavy admission.

The first accepted Idempotency-Key manifest pins original server year, school-local
civil day, UTC bounds/settings identity and one SQL snapshot of active, unmarked
enrollment IDs. Optional class scope is fingerprinted. Temporary selections of
200 IDs commit with that manifest. Each checkpoint commits its marks/count receipt
together. Daily locks and current roster checks preserve any presence/absence
already recorded, including later manual corrections. Partial failure/cancellation
rolls back only the current checkpoint; an explicit same-ID retry recovers earlier
counts and continues pending work. New registrations do not join an accepted intent.
Completed acknowledgements describe the original action, even after calendar/year
changes; they are not a live count. Unknown outcomes never trigger automatic retry.

Current account/stamp/impersonator/grants are checked after receipt/daily waits
and before replay decryption. Pending checkpoints also check lifecycle, settings
identity, timezone boundaries and holiday. Changed class under the same accepted
ID returns 409; missing IDs return 428. Missing selection or parent with surviving
children fails closed with 503. A lost key never reconstructs or reapplies work.
The shared receipt staging helper preserves the submitted fingerprint even when
a mutation callback normalizes its mutable command.

Completed checkpoint counts are recovered in one bounded query rather than
hundreds of receipt transactions per retry. After all checkpoints are durable,
only temporary selection receipts are pruned. Concurrent callers racing pruning
recover retained counts. Manifest/count receipts must survive indefinitely until
a reviewed replacement can prevent old execution. A crash before final pruning
or abandoned partial action may retain targets; retention maintenance remains
open. Default selected-target cap is 50,000 (maximum 250 checkpoints), and one
cooperative 30-second budget spans all work. Deadline/transient failures return
localized no-store 503/Retry-After; no orphan background work or automatic retry.
Legacy unattended empty actors remain no-op; nonempty callers must adopt the
durable contract. SPA Core helper pins account credentials and forwards the
caller-owned request ID without introducing a new UI action.

Validation: full isolated PostgreSQL Core suite 298 passed, zero skipped
(`/tmp/dm-attendance-fill-full-core.log`). Coverage includes failure after writes
before checkpoint commit, cancellation, manifest encryption rollback, selected
roster cap/deadline, original-day/year recovery, late registration exclusion,
manual absence/correction preservation, missing selection/manifest/key failure,
settings deactivation/timezone/closure, and two independent real-JWT HTTP hosts.
The HTTP race deliberately pauses a caller before target selection while another
finishes/prunes, verifies retained-outcome recovery, concurrent duplicate requests,
class fingerprint conflict, stamp revocation during daily-lock wait and localized
no-store responses in en/fa/ps. Completed replay query count is bounded at two
receipt SELECTs. These correctness checks do not establish representative load.

The complete 104-table UI/export audit passed
(`/tmp/dm-attendance-fill-full-ui.log`), including actual new helper transport,
credential pinning, stable intent, cancellation, no-store and no automatic retries.
Core TypeScript, strict locale/mobile parity, hosted-worker drift and precommit
checks passed. Eight backend messages use AttendanceController resources in all
three languages; no new frontend/mobile labels were added.

Local commits: Core `4394e62`, SPA Core `60956c9`, Afghanistan test fixture
`5cc0d12` and API `6e514e6`. Standard backend/SPA scripts rebuilt and installed
the committed packages (`/tmp/dm-attendance-fill-release-dotnet.log`,
`/tmp/dm-attendance-fill-release-spa.log`). The first backend build correctly
rejected the country regression's obsolete constructor; its fixture now supplies
the existing receipt dependency and the complete sync passed. Afghanistan tests
against final installed dependencies: 106 passed, zero skipped
(`/tmp/dm-attendance-fill-final-installed-afghan.log`). Installed shell TypeScript
passed (`/tmp/dm-attendance-fill-release-shell-tsc.log`). Built and API-installed
DLL SHA-256 values match:

- Core: `1a7105c9c0286709366549e1bbe75c59b19df1ed3a29a74a0bc32d02e98a35db`.
- Abstractions: `f1d2d0c84f1e148277739727f60c8ba9a421d71fecefff25cb9fced12a08b1af`.
- Afghanistan: `e279e6326f3d3c745405831c1785945703584e3b6bb690e2930ad394af25f332`.

Installed attendance helper/model JS also matches the SPA Core build. No live
user DB changes or manual server restarts. Restart API/SPA together to load the
coordinated contract; there is no schema migration for this increment.

All seven original requirements remain open. Next work includes remaining
important writers/editors, attendance and wider query/output bounds/index plans,
through-commit reference/permission coordination, shared classroom authority and
background jobs, telemetry and representative multi-school load/recovery evidence.
Do not mark the larger goal complete from this attendance recovery increment.


#### Next attendance read audit: discovered consumer constraints

AttendanceRepository's ListForSchool/ListForStudent/ListForChildren still load
entire selected-year entity graphs, ordered only by timestamp, without
cancellation or no-tracking. These feed the three AttendanceController read
routes and, through other call sites, ClassOverviewController and
ReportCardController. The admin route's optional class/student scope can be empty.
Parent reads first materialize GetChildren; scope/ownership must be checked in
SQL rather than relying only on that preloaded list.

SPA Core useAttendanceViews forwards whole arrays to the shell AdminAttendance,
StudentAttendance and ParentChildAttendance screens. AppAttendanceSummary groups
all marks in the browser, filters original mark creation timestamps before
counting and sorts recent marks. Replacing its input with a paged raw array would
silently corrupt totals. Extend existing repository/DTO/Core component contracts
with SQL aggregation and bounded stable summary pages, keeping applied creation
filters, class/student scope and recent school-local dates consistent. Preserve
separate report-card/class-overview semantics; do not truncate their aggregates
by reusing a raw page as a complete year. Reuse PagedList/UserParams/AppTable and
the shared scoped cancellable read helpers where they fit. Verify representative
query plans and source/DTO payload bounds before declaring this gap covered.


### Bounded standalone attendance summaries (thirty-seventh increment)

The three standalone attendance viewers downloaded entire selected-year mark
graphs and computed per-student totals in the browser. Discovery traced the
shared AttendanceRepository, AppAttendanceSummary, AppTable, creation-date helper,
parent links, school timezone resolver and local report-card/class-overview
callers. Those existing layers are extended. No persistent field/table/index,
country fork, new component library, control or locale key is introduced. A
small nonpersistent Core projection supplies counts/recent dates because raw
AttendanceDto cannot represent an aggregate without fabricating mark entities.

AttendanceRepository.Summary performs counts and stable student pages in SQL.
Only filtered original marks contribute: inclusive UTC creation dates, optional
class and school student scope combine before grouping. Mine ignores supplied
student IDs; children checks the active current-school parent link in SQL. Both
student/class schools and enrollment/class years are constrained. Absences and
inactive historical enrollment marks remain counted; unmarked students remain
absent from this marked-record summary. Legacy duplicate marks are retained,
not silently merged into days. Count, page, bounded recent rows and timezone use
one repeatable-read snapshot and request cancellation. No entity/audit-name
graph, credentials, owned addresses or tracked records are loaded.

The three role-policy routes are mine/summary, children/summary and school/summary.
The shared staff endpoint map retains attendance.read for school reads. PageSize
clamps to 1–50 and page number to the existing snapshot range. RecentDays clamps
to 0–30 marks per returned student; one window query is restricted to the current
page's IDs. Recent timestamps become school-local civil dates through the existing
DailyAttendanceWriter.TimeZone; the UI formats them in UTC with the country
calendar so host timezone cannot shift them. These are counts of stored marks,
not inferred attendance, distinct daily totals or an enrollment census.

AppAttendanceSummary.source reuses its table/columns, and all three shell viewers
now delegate to it. Local array callers remain compatible without acquiring a
request/loader provider. Creation dates/class controls remain in the shared
draft/Apply/Reset section, with one request per applied scope/page. Requests pin
credentials and pass cancellation/no-store. Locale/token reloads and obsolete
response suppression use the existing table/request helpers; no automatic retry
or whole-year fallback fetch is introduced.

Core AppTable.serverSort is opt-in: pass sortBy/sortOrder, reset page one and keep
the accepted server page order. Other tables preserve their behavior. GeneralParams
exposes optional shared sort keys; repositories must opt in/whitelist them. Summary
allows studentLabel/present/absent/rate and breaks all ties with student ID. Unknown
keys fall back to ID; no interpolated SQL identifiers. Precise rate proportions
sort before percentage display rounding. Sorting metadata does not become a
filter badge or draft value. This preserves global sorting while paging totals.

Validation: all 302 isolated PostgreSQL Core tests passed, zero skipped
(`/tmp/dm-attendance-summary-full-core.log`). New coverage includes counts before
paging and filtering, recent row caps, stable pages and global ordering, class/
year/student boundaries, cross-school corrupt references, active parent links,
cancellation/no tracking and a concurrent new mark between count/page reads.
Real JWT HTTP tests verify original role policies, student/parent supplied-ID
spoofing resistance, no-store/pagination, scope and localized invalid date ranges
in all three languages. Existing wide goal tests remain passing; this is not
through-commit membership coordination proof.

Private warm fixture: 24,000 marks/120 students, 50 summaries/1,500 recent marks,
60,401 JSON bytes, 24.38 ms for the repository method in the focused run. EXPLAIN
(ANALYZE, BUFFERS) used the existing IX_Attendance_DailyLookup: count 5.101 ms,
page 6.356 ms, recent 5.517 ms, timezone lookup 0.007 ms
(`/tmp/dm-attendance-summary-plans.log`). The recent query restricts its indexed
enrollment loops to 50 page students instead of all 120. No extra index was
justified. These warm local measurements are neither whole-app HTTP latency
nor representative production concurrency/supported-user evidence.

Actual shared component/table/API tests in en/fa/ps verify all three real shell
consumers, combined draft filters, page queries, retained complete totals/ratios,
three-state global sorting/page reset, pinned credentials, token changes, aborts
and late response suppression. Local-array mode also renders without a loader
provider (`scripts/tests/attendance-summary.cjs`, `/tmp/dm-attendance-summary-ui.log`).
The test is included in the complete 104-table UI/export audit, which passed
after the local-array compatibility change
(`/tmp/dm-attendance-summary-final-ui.log`). Core TypeScript, strict locale
parity and local precommit component/route checks passed. React review retained
shared components, stable primitive request dependencies, no mirrored page state,
no fetch effects in shell consumers and keyboard-accessible table sort controls.

Local commits: Core `30d151a`, SPA Core `3e36b7a`, SPA shell `65510308`, API docs
`9f95972`. Standard scripts rebuilt and installed committed packages
(`/tmp/dm-attendance-summary-release-dotnet.log`,
`/tmp/dm-attendance-summary-release-spa.log`). Installed-dependency Afghanistan
regressions: 106 passed, zero skipped (`/tmp/dm-attendance-summary-release-afghan.log`).
Shell TypeScript passed (`/tmp/dm-attendance-summary-release-shell-tsc.log`).
Built and API-installed DLL SHA-256 values match:

- Core: `19a79d8b201fb8c1d94150adfd1b97c2d6e8ce6b340554a47ec5cad3b5c70166`.
- Abstractions: `b565401897463d17e0f509bb1abfb811666bbee3fd48eec6e1891ef869c9ccd8`.
- Afghanistan: `8de2678b4066082473c124d383767a2c83ab1b66ca39afe3e1fdc08463e85e35`.

Installed attendance API/model, summary and AppTable JS match the source build.
No live user DB changes or manual server restarts. Restart API/SPA together to
load the new summary routes and clients. No schema migration is added.

All seven original completion requirements remain open. Legacy raw attendance
routes and report-card/class-overview/mobile inputs still need their own output/
query bounds; never use one raw page as a full-year total. Remaining important
writers/editors, through-commit reference/permission coordination, the wider
invariant/query/index audit, distributed classroom/jobs, telemetry and isolated
representative multi-school load/recovery evidence retain their full scope.


### Existing Admin Actions attendance integration (thirty-eighth increment)

The wider caller search discovered that the earlier fill integration audit missed
school.autoPresentToday and the existing AdminActions button. That alias still
posted without the now-required UUID, and its copy incorrectly described a nightly
unattended marker. This carryover was fixed before further reader work.

School.autoPresentToday now directly aliases attendance.fillMissingToday, with
the required caller request ID and the existing AttendanceFillResult type. No
second POST implementation, generated transport UUID, DTO copy or backend/schema
change is introduced. The existing control moves to Core AppAttendanceFillAction
and composes AppCard/AppButton/AppModal/AppAlert with useMutationIntent. Existing
versioned editors require revisions and password-reset controls have credential
semantics, so neither represents this acknowledgement-only domain action; there
is no new generic form/intent registry or lower-module control implementation.

An explicit verified-presence confirmation starts the action. Ref-gated single
flight blocks duplicate events, busy modal controls stay locked, credentials are
pinned and cancellation follows scope/unmount. A valid acknowledgement must
contain the original civil date/year and bounded nonnegative counts before the
control accepts success. Failed/malformed responses retain the UUID through
explicit recovery, modal closure and locale/token renewal. Recovery refers to the
original action rather than confirming a new current-day run. Known success
shows its original date/count using country calendar formatting with UTC civil
date semantics. Only known success plus explicit new-run confirmation resets
the intent. Account changes remount the domain control and abort/suppress old
responses. No automatic retry or unattended presence inference is introduced.

This is mounted-action recovery: a full navigation/reload still loses this
in-memory intent, consistent with the current shared mutation hook. It is not
a persisted request history or the parked workspace/draft feature. Durable
backend receipts remain authoritative for any caller that retains the original
UUID. Cross-reload action recovery and the fee/promotion buttons' original-context
and durable-outcome audit remain separate work.

All new/updated text ships in English/Dari/Pashto and the three mirrored mobile
bundles. Stale nightly-service claims and the failed-action instruction to check
API logs are removed from this attendance control. Core owns all behavior and
controls; country packages own translations/calendar formatting.

Validation: actual AdminActions screen, Core action/modal/intent and API transport
pass in all three languages (`scripts/tests/admin-attendance-fill.cjs`,
`/tmp/dm-admin-fill-ui.log`). Coverage includes confirmation/cancel without writes,
double submit, failed response, malformed acknowledgement, same-ID recovery,
locale/token renewal, explicit new IDs only after known results, account-switch
abort and stale-result suppression. Actual Gregorian/Solar Hijri result formatting
is checked through the existing country adapter. The school compatibility alias
is exercised with UUID/signal/pinned credentials. The test is now part of the
complete 104-table UI/export audit, which passed after the recovery-dialog change
(`/tmp/dm-admin-fill-final-ui.log`). Core TypeScript, strict locale/mobile parity
and precommit checks passed. These UI correctness checks do not establish new
backend concurrency/load evidence; no C# behavior changed in this increment.

Local commits: SPA Core `8db990f`, Afghanistan SPA `84c044e`, mobile country
`0185ef2`, shell `8008d301`, API docs `59ff6ff`. Standard SPA sync rebuilt/installed
the committed packages (`/tmp/dm-admin-fill-release-spa.log`). Installed school
API alias, Core action and component index JS match the build; all three source
locale bundles match shell-installed bundles. Shell TypeScript passed against
these installed dependencies (`/tmp/dm-admin-fill-shell-tsc.log`). Mobile used its
existing pack script (`/tmp/dm-admin-fill-mobile-pack.log`); the local tarball was
extracted into both mobile consumers. All three source/dist/parent/student locale
checksums match. No backend/schema change, user DB writes or manual server
restarts; restart SPA to load the coordinated control/exports/translations.

All seven original goal requirements remain open; the remaining reader,
writer/invariant, distributed jobs/classroom, observability and representative
multi-school load/recovery scope is unchanged.


### Paged raw attendance and shared reader scope (thirty-ninth increment)

Discovery traced the remaining unbounded raw AttendanceController routes, the
existing bounded teacher/student repository path, PagedList/AttendanceParams,
raw SPA helpers and full-history report consumers. Mobile already calls the
paged /Student/attendance route; its omitted DateTime was being mapped to an
invalid DateTime.MinValue. Existing domain entities, AttendanceDto/reference DTOs,
paging, timezone resolver and header mapping are reused. No persistent field,
table, duplicate record DTO, service registry or index is introduced. The
unused school-wide ListForSchool method is retired rather than left as another
unbounded browser path. Full-history report methods retain their separate callers.

AttendanceRepository.Page now serves raw mine/children/school and teacher/student
records. Summary and records reuse one FilteredMarks query: both school
boundaries, class/enrollment year, server-owned student/teacher scope, active
current-school parent link, original creation dates and optional civil-day filter.
A parent-supplied student ID narrows within actual links and cannot expand access;
mine forces the authenticated student. Raw routes retain the selected server
year. Teacher ownership checks/explicit-scope requirement remain. Inactive
historical enrollments and absence rows remain visible. Date boundaries reuse
the existing school timezone/half-open UTC resolver.

Raw count/page share a repeatable-read snapshot and request cancellation. Only
reference navigations on at most 50 root records are requested, with no tracking
and stable timestamp-desc/immutable-ID ordering. Existing JSON record shape and
country enrichment remain available. A corrupt legacy class-to-foreign-branch
reference keeps the attendance mark/count but clears that foreign branch on the
no-tracking response copy. No stored data/history is rewritten. Raw reads still
load bounded person entities internally; this does not finish the broader field/
projection/audit-label batching audit. Responses use no-store and standard
Pagination metadata; complete counts still come from /summary, not a raw page.

AttendanceParams.DateTime is nullable. Omission now reads a bounded selected-year
page; explicit invalid dates return AttendanceController's localized 400, including
student actions. No new locale keys are needed. GeneralParams clamps sizes to
1–50, including manually constructed empty pages. Shared PagedList uses 64-bit
offsets and skips item SQL beyond the counted result, preserving empty-page
headers without negative overflow or enormous OFFSET scans. That helper does not
give every repository stable order/snapshot semantics.

SPA raw helpers/useAttendanceViews now accept paging/filter/signal/token options,
pin credentials and retain metadata. Each call performs one page request; no
automatic whole-year fetch or retry is introduced. Standalone screens already
use the server summary. Parent summary student filters were also aligned with
actual link-constrained narrowing.

Validation: complete isolated PostgreSQL Core suite 305 passed, zero skipped
(`/tmp/dm-attendance-records-full-core.log`). New coverage includes stable
73-record paging, SQL-side combined filters, false-status/history preservation,
wrong-school references, active parent links, school-day boundaries, cancellation/
no tracking, extreme-page single-count/no-offset behavior and a concurrent insert
between count and page. Real JWT HTTP tests use the actual Core mapper profiles
and the API's Newtonsoft loop/enum settings, verifying all raw role routes,
student date omission, forged student scopes, standard metadata, bounded record
shape, no credentials/stamps or foreign branch details, and exact English/Dari/
Pashto invalid-date messages. The final full run includes the foreign-reference
response-copy test. These are correctness/boundedness checks, not new production
throughput or through-commit permission-coordination evidence.

Actual SPA API/hook tests verify complete criteria, page metadata, pinned token,
no-store, cancellation-before-send and no whole-year fallback
(`scripts/tests/attendance-summary.cjs`, `/tmp/dm-attendance-records-ui.log`). The
complete 104-table UI/export audit passed (`/tmp/dm-attendance-records-full-ui.log`).
Core TypeScript and precommit checks passed. Local commits: Core `5d7d4d3`,
SPA Core `b554a76`, API docs `9a8ff6b`. Standard backend/SPA scripts rebuilt and
installed committed packages (`/tmp/dm-attendance-records-release-dotnet.log`,
`/tmp/dm-attendance-records-release-spa.log`). Installed-dependency Afghanistan
regressions passed: 106, zero skipped (`/tmp/dm-attendance-records-release-afghan.log`).
Shell TypeScript passed (`/tmp/dm-attendance-records-release-shell-tsc.log`).
Built and API-installed DLL SHA-256 values match:

- Core: `1b35133ad102eaed87f9ac001e27ad814515874e7affbfb18b1ff45d86ebdda2`.
- Abstractions: `b8e45cd828baff55771a6f029b53f88f05383ae6c49485a378be7e5e34587cfe`.
- Afghanistan: `55b620cec9556eb1219420a9d4905e703547d112ce5f449cce33ed16af819155`.

Installed raw attendance API/hook JS matches the build. No live user DB changes
or manual server restarts; restart API/SPA together. There is no schema migration.

All seven original requirements remain open. Report-card/class-overview full
history needs aggregation/output work. Mobile's current student screen counts
only its loaded page, shows every mark as present and uses host Gregorian dates;
its query keys/transport also need account-scope work. The backend omission fix
does not claim complete mobile attendance. Other important writers/editors,
invariants, wider query/index/export bounds, shared jobs/classroom authority,
telemetry and representative multi-school load/recovery remain in full scope.

### Shared mobile session runtime (fortieth implementation increment, 2026-10-26)

Discovery traced both mobile clients, stores, SecureStore adapters, actual query
hooks and login screens. Both hosts copied the same runtime; the mobile SDK is
explicitly type-only and SPA Core is browser-oriented. New shared
`@digitalmaktab/mobile-core` owns that runtime, with host adapters for API URL,
role-specific login parsing and native storage. Country calendar/localization
remain in the country module. Existing identity fields and the two secure keys
are reused; no database/schema or second credential store was added.

The HTTP facade pins credentials at invocation, forwards aborts, cancels active
requests when tokens change and rejects late responses/errors. Only a current
protected 401 can invalidate the current account. Public login and stale 401s
cannot. Default limits: 16 active transports, 20-second maximum per-call timeout,
50,000 normalized JSON nodes, 48 nesting levels. No queue, orphan Promise.race,
automatic write retry or whole-year request loop. A noncooperating cancelled
adapter retains its slot until settlement. JSON normalization preserves false
values and avoids prototype setters; traversal limits do not bound wire bytes,
JSON parsing or native heap usage. Relative-path restriction does not constitute
complete redirect or transport security validation.

Shared auth separates attempt epochs from opaque API scopes, single-flights
hydration and serializes bounded native storage jobs. Old login/write/hydration
outcomes cannot publish over newer intent. Logout removes memory credentials
before awaiting physical deletion; partial writes/corrupt pairs are retired.
Local ID/role/school JWT-payload binding detects torn pairs but does not validate
signatures, expiration or grant access. The API remains authoritative. Existing
two-key storage is not crash atomic; native read/write/erasure can fail. Queue
capacity also fails closed instead of accumulating unbounded storage work.

A Core query provider replaces the private QueryClient on each runtime/token
scope and cancels/clears old clients. No token/identity enters cache keys. All
current parent/student/shared data read hooks forward Query cancellation to HTTP.
Login pending state moved into the coordinated store so an old completion cannot
reenable a newer pending submit. Existing translated error keys are reused. Both
Expo tsconfigs now allow the existing app.config.ts explicit .ts import with
noEmit, fixing the pre-existing TS5097 typecheck failure.

Validation: `scripts/tests/mobile-runtime.cjs` passes against actual Core sources,
both actual host adapters and their read hooks, controlled Axios/storage and real
React Query. Coverage includes stale success/401, public/current 401 behavior,
credential capture, capacity/no-queue/noncooperating aborts, timeout caps, JSON
budgets/prototype safety, binding rejection, hydration/write/logout races,
private-cache replacement and transport cancellation from unmounting all current
role/shared read hooks. Parent, student and Core TypeScript checks pass; strict
mobile i18n and package-version checks pass. Precommit now runs mobile typechecks
and runtime tests; the root health gate includes the regression. These are
controlled correctness tests, not native device/live backend/load verification.

New `scripts/sync-mobile.sh` builds/packs SDK, Core and discovered country/school
packages, installs only declared consumers and refreshes matching local tarball
lock integrity without resolving unrelated dependencies. Dependency metadata
changes still require normal npm install. Post-merge invokes this script for
mobile packages. It was run twice successfully. Every built dist file matches
both installed consumers: Core 12, SDK 32 and Afghanistan 23 files per app; all
six consumer package-lock SHA-512 values match the exact tarballs. Country's SDK
lock also changed to the rebuilt artifact. Restart Metro to load swapped packages;
no user-owned server/device or live database was changed.

Local commits: mobile Core `0ec07cd`, parent `2ceaba9`, student `a939d31`, mobile
Afghanistan lock `ef93f94`. Nothing pushed. Logs:
`/tmp/dm-mobile-runtime-{tests,sync,i18n,versions}.log` and
`/tmp/dm-mobile-{parent,student,core}-runtime-final-tsc.log`.

All seven completion requirements remain open. This covers HTTP/private-query
account isolation, not the SignalR connection lifecycle, locale/country cache
scopes, every mutation's durable/versioned behavior, or native OS failure recovery.
Token renewal currently resets the private subtree and does not retain unsaved
forms. Mobile attendance screens still need server totals, accurate presence
status, native-calendar dates and bounded paging. Report-card/class-overview
history aggregation, other important writers/editors/invariants, wider query/
index/export bounds, shared jobs/classroom authority, telemetry and representative
multi-school load/recovery remain in full scope.

### Accurate bounded mobile attendance (forty-first increment, 2026-10-26)

Discovery traced the actual student/parent attendance screens, their only hook/
transport callers, duplicated mobile DTOs, country calendar contract, native Core
components/theme/RTL and existing backend summary projection/headers. No new
persistent model, server aggregate, calendar implementation or native component
was needed. Mobile Core now owns one wire projection, validated paged reader,
query hook and civil-date formatting helper. Both role hosts consume it and their
unused raw attendance transports were removed. Other readers remain unchanged.

Student totals no longer count the first raw page. Parent totals no longer count
only returned marks or require another children request/legacy name fields. Both
use recorded-year present/absent totals and the server student label. False marks
render visibly as absent. At most thirty recent marks per student are shown,
explicitly labelled as an excerpt; unmarked days are never inferred. Parent
summaries page through ten students per explicit navigation, including empty/error
recovery via Previous. No automatic whole-year loading is introduced. Server
pagination/shape failures use the existing error/retry flow, never fabricated
counts. Each hook forwards aborts and remains inside the account-scoped provider.

School-resolved civil days go to the country calendar formatter with UTC, so
Afghan screens render Solar Hijri dates in all interface languages. Without a
country formatter, Core explicitly uses Gregorian independently of interface
language. Touched rows/labels use the existing theme and RTL contexts; host native
components remain in use. New excerpt/status/paging labels are present in English,
Dari and Pashto. This does not repair build-time country selection for all mobile
schools or supply a complete historical mark browser.

Validation: extended `scripts/tests/mobile-runtime.cjs` passes with actual read
hooks and both mounted screen sources, controlled transport/native presentation
adapters, real React Query and the actual country calendar/locale bundles.
Verifies 91/12 totals with only two recent marks, false-status icons/text,
English/Dari/Pashto school dates, Gregorian fallback despite Dari interface,
server labels, parent page two beyond ten pupils, cancellation and malformed
pagination/invalid civil dates/overlong excerpts. Tests do not establish native
platform behavior, server throughput or new backend authorization guarantees;
existing Core route/SQL snapshot tests cover the reused endpoints.

Core build and both installed-dependency app TypeScript checks passed. Strict
mobile i18n and all affected precommit gates passed. Sync rebuilt and installed
SDK/Core/country artifacts: all fourteen Core dist files, thirty-two SDK files and
twenty-three country files match both consumers, and all six lock integrities
match the packed artifacts. Logs: `/tmp/dm-mobile-attendance-{tests,sync,i18n}.log`,
`/tmp/dm-mobile-{parent,student}-attendance-tsc.log`. No backend/schema/live DB or
user-owned server changes. Restart Metro to consume the new artifacts.

Local commits: mobile Core `ed60f16`, parent `08abe3c`, student `adc6e36`, mobile
Afghanistan `8fa6756`. Nothing pushed. All seven overall completion requirements
remain open: full-history/report-card/class-overview reads, other important
writers/editors/reference invariants, remaining query/index/import/export bounds,
SignalR/shared jobs and authority, locale/country scope, telemetry and representative
multi-school load/recovery remain in scope. These two mobile increments do not
establish completion of the wider concurrency/performance goal.

### Bounded composite academic reports (forty-second increment, 2026-10-26)

Discovery traced report-card/class-overview controllers, per-domain repositories,
DTOs/mappers, actual SPA callers (including ID cards), country response enrichment,
calendar selection and the shared attendance aggregate. Existing ordinary paged
lists cannot provide one multi-domain snapshot: class overview's nominal 200-row
roster silently became 50 through the general page clamp, while attendance/grades/
fees were materialized separately. New Core AcademicReportRepository owns this
read orchestration, reusing every stored entity and the existing attendance SQL
pipeline. No new table, persistent field, calendar or duplicate aggregate was added.

Report-card and class-overview DTOs replace raw attendance with attendanceSummary.
AttendanceRepository.ForReport accepts at most 200 roster IDs, batches by 50 and
uses the same filtered grouping/window query as standalone summaries. It requires
an enclosing repeatable-read snapshot. Ordinary Summary may own or join an exact
repeatable-read snapshot; weaker transactions fail. Removed the now-unused full
history attendance methods. Reports no longer load attendance graphs for counts.
Presence/absence and inactive historical enrollment semantics remain explicit.

All Core report-domain reads share one repeatable-read transaction. Collection
probes take at most limit + 1 scalar IDs before includes; limits are roster 200,
grades 5,000, fee rows 200 and schedule slots 200. Over-limit results return a
translated 413, never a partial report. Report cards scope fees to selected school/
year. School/class/course/enrollment ownership/year checks exclude invalid foreign
references; response copies omit foreign branches/teachers. Parent reads now reject
stale cross-school links, closing an older report-only exception and aligning with
raw/summary attendance. Stored historical anomalies are preserved. Afghanistan's
integration test explicitly covers the strengthened boundary and still verifies
country person enrichment and selected academic years.

GETs use no-store, the shared heavy-operation gate, request aborts and a cooperative
20-second cancellation budget. Mapping checks cancellation between roots; legacy
synchronous audit-label queries can finish an already-started provider command.
This is not a physical hard deadline, a fully batched actor lookup contract or a
claim of production throughput. Existing post-read module enrichment is preserved;
its cross-domain snapshot consistency remains separate work.

The Core attendance table reuses complete bounded initial report aggregates for
unfiltered paging and issues a fresh server summary only after explicit filters/
sorting. Original mark creation filters, country civil dates and the shared table
lifecycle remain. Report-level KPIs describe their composite snapshot. Scoped Core
report hooks now use useReloadableRead: pinned credentials, no-store, cancellation,
account/language/resource isolation, manual retry and retained same-scope data after
transient failures. Shell consumers were adapted. Admin comment drafts survive
same-record refresh, and abandoned view outcomes cannot update another resource.
Comment write preconditions/durable replay are not supplied by these read changes.
ID cards now use the existing student-detail read instead of loading a report.

Validation: full isolated PostgreSQL Core suite 308 passed, zero skipped
(`/tmp/dm-academic-report-full-core.log`); final focused report/summary checks 7
passed after the final mapping/reference changes (`/tmp/dm-academic-report-final-core.log`).
New tests cover complete 73-entry rosters, true totals/absences, 201-entry rejection
before graph loading, selected-year fee isolation, concurrent attendance/fee writes,
transaction cleanup/cancellation, real JWT policies/school/parent boundaries,
production mapper/JSON privacy and English/Dari/Pashto oversize errors. Afghanistan
106 passed, zero skipped (`/tmp/dm-academic-report-afghan.log`). The complete 104-table
UI/export gate passed after final client changes (`/tmp/dm-academic-report-release-ui.log`).
Actual hook tests exercise credentials, account/resource cancellation and late-result
suppression; actual document/admin/ID-card screens cover retained drafts, direct
person reads and locale rendering. Aggregate table tests cover snapshot paging
without extra requests and fresh original-mark date filtering in all three locales.
Shell/Core TypeScript, strict i18n coverage/parity and affected precommit gates pass.

All packages rebuilt/installed through standard scripts; no manual server restart
or live user DB change. Logs: `/tmp/dm-academic-report-release-{dotnet,spa,mobile}.log`.
Every SPA Core dist file (1,965) and Afghanistan dist file (183) matches the shell.
Mobile Core/SDK/country dist files match both hosts, and all six tarball lock
integrities match. Built/API DLL SHA-256 values match:

- Core: `999668cd8158594f80329697ed2ccd25a1d789bd3b6957bab55072d8a3b32f7d`.
- Abstractions: `1887526de4d230c2b9601df839057c344ccee9e2595de61c61a9ea6e59fe7be9`.
- Afghanistan: `68e04052408497f67b9289aa65642f64f651201cf7943f3520e37924874001c8`.

Local commits: Core `b2b5f82`, SPA Core `d8a9c46`, SPA country `1024368`, shell
`3f9d0810`, API `aadf555`, country integration `522db0a`, mobile locales `e72a504`.
No pushes. Restart API and SPA together for the DTO change; restart Metro for the
mirrored locale package. Core docs/ACADEMIC-REPORT-LIMITS.md describes the contract.

The broader goal is not complete; all seven top-level requirements remain open.
Concrete remaining work includes report-comment and other important editor/write
preconditions/replay; remaining grade/fee/lookup/inventory reads and actor batching;
other domain/reference/permission invariants and expensive outputs; module snapshot
composition; shared classroom authority/state and remaining job coordination;
mobile SignalR/locale/country scope; telemetry export and representative multi-school
load, recovery and deployment evidence. Focused report tests do not establish these.


### Report-comment versions and recovery (forty-third increment, 2026-10-26)

Discovery traced the existing ReportCardComment, Student.Revision, module-profile
IRevisionedExtension, shared row locks/receipts, selected-year provider, school-year
banner and all comment callers. The existing student aggregate represents the
concurrency boundary: comments implement the explicit revision-owner interface,
including deletion, without a new stored version, history/request table or migration.
Core ReportCardCommentRepository replaces direct controller upserts. Its small GET
reads ownership/version/year/comment in a repeatable-read snapshot. The displayed
start comes from existing school-year settings, with shared-year fallback only when
settings are absent. PUT requires original revision, explicit year and stable request
UUID. Student row locks/reload and shared RecordVersions reject missing/stale saves;
current actor/stamp/impersonator/grants and school ownership are rechecked after waits.
Text, owner version, audit and encrypted durable receipt commit together. Replaying
an accepted original result precedes current-year/version validation and never
restores text after a later clear/profile correction. Login stamps stay unchanged.

SPA Core owns the one shared editor using existing forms, version hook, intent hook
and comparison modal. Unknown outcomes freeze body/key and lock changes until manual
recovery. Only known shared version rejections retire the intent. Acknowledgements
are validated; same-actor student switches create fresh IDs while token renewal
preserves them. Late account/resource responses are ignored. Conflict comparison
includes the country-formatted school start and explicit replacement never saves.
The shell retains the editor during report refreshes so locale/token changes preserve
drafts. Read-only staff do not render/fetch it. Editor states are excluded from print.
AppBaseEditor.submitLabel only forwards the existing form-card option. New UI labels
ship in all three SPA/mobile locales. Recovery is mounted-form, not persistent drafts.

Validation: full isolated PostgreSQL Core suite 312 passed, zero skipped
(`/tmp/dm-comment-full-core-final.log`); final focused four comment tests passed after
school-year/explicit-owner refinements (`/tmp/dm-comment-verified-races.log`). Real
independent Kestrel hosts cover twelve competing identical saves, distinct stale
intents, clear/profile revisions, restart replay, changed payload, year changes,
three locale errors/dates, parent/student/foreign-school rejection, current staff
grants including revocation while waiting, and receipt-failure transaction rollback.
Existing shared fixture classes use the nonparallel host collection to isolate global
mapper/year setup; their actual HTTP/database race requests remain concurrent.
Afghanistan 106 passed, zero skipped (`/tmp/dm-comment-afghan.log`). Complete shared
104-table UI gate passes on final source (`/tmp/dm-comment-final-ui.log`); actual editor
and document tests cover frozen retries, malformed responses, pending guards,
conflict/reload failures, same-actor record changes, account/token/locale changes,
read-only permissions and retained drafts. Installed shell TypeScript passes
(`/tmp/dm-comment-final-shell-tsc.log`); strict i18n coverage/parity/mobile pass.

Committed packages rebuilt/installed through standard scripts; no live user DB or
manual server restart. Final SPA log `/tmp/dm-comment-final-spa.log`, backend
`/tmp/dm-comment-release-dotnet.log`, mobile `/tmp/dm-comment-sync-mobile.log`.
All 1,969 SPA Core and 183 country dist files match installed shell; mobile Core14,
SDK32 and country23 files match both apps. Built/API installed DLL SHA256 matches:
Core `4d4da3a808313047083057fab7aa6cbb9c1482499b047704cd0a45ae006e885e`,
Abstractions `7e616a70e59b32ccba7adc82183ff76f555e587d774a0bb0a85d18458392e9e2`,
Afghanistan `47c518165b3c90c412c0efa1d9ddb15a59027408cce7b4105cd0b2e97d573279`.
Local commits: Core `0d1dc59`, API `dee6ee1`, backend country `bb1eaa7`, SPA Core
`76c0f1e`, SPA country `7f9d507`, shell `b55bd54b`, mobile locales `c5aaf6d`,
parent `f0162a6`, student `b5eb14f`. Nothing pushed. Deploy Core.Abstractions/Core/API/
SPA together and remove old API writers that ignore versions/keys; restart API/SPA
jointly and Metro for locale artifacts. Core docs/REPORT-COMMENT-CONCURRENCY.md
records the contract and limits. This does not lock every year/reference/grant writer
through commit or protect unrelated editors.

All seven broader completion requirements remain open. Next concrete gap: report
attendance filters currently call the ordinary attendance-permission endpoint, so
reports.read staff without attendance.read get403 after seeing initial report totals.
Use report-authorized bounded scoped readers, never broaden staff grants to hide it.
Other writers, read/query bounds and actor batching, module snapshots, shared classroom
state/jobs, mobile SignalR/country/locale, telemetry and representative multi-school
load/recovery/deployment evidence remain required.


### Report-scoped attendance filtering (forty-fourth increment, 2026-10-26)

Discovery followed the actual AppReportCard/AdminClassOverview tables, shared summary
transport, report/student/parent ownership predicates and StaffEndpointPermissions.
Initial attendance snapshots were visible to reports.read staff, but applying any
filter used /attendance/school/summary and required attendance.read. Broadening grants
would expose unrelated attendance. Existing AcademicReportRepository now extends its
read orchestration with report-authorized paged summaries, reusing the exact shared
AttendanceRepository.Summary and report ownership/year predicates. No stored field,
table, DTO, query fork or index was added.

New GET routes: report-card/mine/attendance, report-card/child/{studentId}/attendance,
report-card/student/{studentId}/attendance and class-overview/{classId}/attendance.
Route identity cannot be replaced by query IDs; a student query only narrows a class.
Student/parent policies retain actual current account/link restrictions. Foreign and
wrong-year resources return 404, not another school's data. reports.read does not grant
general attendance browsing. Each read owns one repeatable-read snapshot across scope,
selected year and shared aggregate statements, with report heavy admission,
cancellation/cooperative 20-second budget/no-store and pagination. It loads no grade,
fee, schedule or complete report-roster graph. Existing page/window bounds remain 50/
30; mark creation-date criteria and whitelisted sorting precede grouping/paging.
Common BaseController creation-date validation remains unchanged, including early 400.
Date-time validation uses the existing translated error in each report controller.

AttendanceSummaryScope.context selects report endpoints in the one Core transport;
ordinary attendance sources retain their endpoints. Context joins resource/account/
language/snapshot reload identity. Initial bounded report snapshots still page without
network reads; only explicit filtering/sorting fetches fresh matching aggregates.
Report KPIs retain the original composite snapshot. Core and class shell consumers
use the same shared table/filters/controls; no parallel UI component was introduced.

Validation: full isolated PostgreSQL Core suite 314 passed, zero skipped
(`/tmp/dm-report-filter-full-core.log`); five focused academic-read tests passed
(`/tmp/dm-report-filter-core.log`). New real JWT/Kestrel tests cover report-only staff
success, standalone attendance 403, grant revocation without new tokens, route/query
scope conflicts, student mine and parent child restrictions, foreign children,
inactive parents, date filtering and invalid dates in all three locales, selected years,
concurrent mark writes, cancellation/transaction cleanup, stable bounded summaries
and no grade/fee/timetable reads. Existing host setup now uses the actual staff access
registration, with independent race requests still concurrent. Actual shared UI tests
exercise all report source kinds/paths and creation filters in each locale; initial
snapshot paging stays request-free. Complete 104-table UI gate passes
(`/tmp/dm-report-filter-full-ui.log`); Core TypeScript and affected precommit gates pass.
Afghanistan integration suite 106 passed, zero skipped against the rebuilt packages
(`/tmp/dm-report-filter-country.log`).

Local commits: Core `4ad9c66`, SPA Core `72fba74`, shell e2f0cbba, API documentation `6b99619`.
Standard package rebuild/install logs `/tmp/dm-report-filter-sync-{dotnet,spa}.log`.
All 1,969 SPA Core and 183 country dist files match installed shell. Built/API installed
DLL SHA256 values match: Core
`7d5b0482f1c5e2445655c2b6403742644c1cc5a152fde369344ea7826314b337`,
Abstractions `64e3e7193a1ccebd1a4467dfe4af341098a3a9804c25359e29c2b25f13b80c69`,
country `75724840fbc55442b489175b745fb6e7c2fc7bab398b8880e68bef034bbdab03`.
No pushes, live database changes or manual user server restarts. Deploy Core endpoints
before/with SPA consumers. See Core docs/ACADEMIC-REPORT-LIMITS.md.

All seven overall completion requirements remain open. The report-filter permission
gap is closed. Remaining work includes other versioned/durable writers and reference
invariants; read/query bounds and actor batching; module snapshots; shared classroom
state/jobs; mobile SignalR/country/locale; telemetry and representative multi-school
load/recovery/deployment evidence. A bounded report-specific read does not prove the
whole read/performance audit complete.


### Batched report-root audit labels (forty-fifth increment, 2026-10-26)

Discovery traced BaseMapper/MappingHelper, every report mapping profile, nested DTOs,
UserResolver and DataContext's existing 512-entry school-keyed label cache. The cache
already avoided repeated lookups for one author but still issued one synchronous
SQL command per distinct author. Extend that resolver/cache rather than creating a
parallel actor registry or global cache. Both fallback and primed paths now share
one scalar query over the existing account tables, preserving platform/school/person
precedence, school filtering, names, cached misses and SaveChanges invalidation.
The new private ActorLabel is only a query projection, not a mapped/persistent model.

UserResolver.PrimeAsync accepts at most 50 Base roots/100 distinct creation/update actor
IDs. It primes missing labels with one async UNION query, at most 600 candidate scalar
rows, with request and caller cancellation linked. The same 512-entry cache is cleared
before a new batch would exceed capacity. AcademicReportRepository now maps each
50-root batch immediately after priming inside its existing repeatable-read snapshot
and cooperative cancellation budget. No schema, DTO, index, UI or country rule change.
Nested mappings may still resolve actors absent from the primed roots synchronously;
other callers retain their fallback behavior. This does not finish actor batching,
make every mapper async or establish hard deadlines/application capacity.

Validation: ten focused isolated PostgreSQL tests passed
(`/tmp/dm-actor-batch-focused.log`); full Core suite 314 passed, zero skipped
(`/tmp/dm-actor-batch-full-core.log`). The real transient mapper comparison over 120
actors uses 120 SQL fallback reads versus 3 primed reads, with matching labels and existing
identity precedence. That local full-suite run measured 2,905.9 ms versus 153.8 ms; concurrent
fixture/JIT/provider effects mean this is only a local comparison, not a throughput
promise or supported-user count. Tests cover foreign-school exclusion on changed
bindings, platform identity collision precedence, cached misses/hits, bounded input,
save invalidation, no credential/navigation fields, no tracked accounts and cancellation.
A real 73-roster report with distinct root authors requires 2 label queries; interception
now also observes synchronous fallback queries, so unexpected per-author mapper reads
cannot hide from that assertion. Existing report snapshot/tenancy/limits tests remain.

Core local commit `d09960b`; standard package rebuild/install
`/tmp/dm-actor-batch-sync-dotnet.log`. Built/API installed DLL SHA256 match:
Core `28ec560c78117db59275e0c277d795c7ee02a7f55d7294444f984636fde22569`,
Abstractions `019ff3a950d7523a9086a3599bc46b1b2c285e93d0e4e8b1468354693f59c4d1`,
country `2ec17605ac44558607b9edd411ae447a01c39bc176016d1cf05810e61f549bb0`.
No live user DB, manual server restart or push. No frontend changes in this increment;
the preceding complete 104-table UI gate and installed SPA artifacts remain current.
Afghanistan integration 106 passed, zero skipped with the rebuilt packages
(`/tmp/dm-actor-batch-country.log`).
See Core docs/ACADEMIC-REPORT-LIMITS.md for precise root/fallback limits.

All seven broader completion requirements remain open. Next concrete read audit:
StudentRepository.GetStudents includes all matching pupils' enrollment histories and
TeacherRepository.GetTeachers includes classes/schedules under 50 paged roots. A root
page clamp does not bound those nested graphs or prove count/page snapshot consistency.
Trace actual table/mobile/teacher callers and module enrichers before changing these
contracts. Remaining writers/reference invariants, other bounded reads and nested actor
mapping, module snapshots, shared classroom state/jobs, mobile SignalR/country/locale,
telemetry and representative multi-school load/recovery/deployment remain in scope.


### Scalar-first student and teacher pages (forty-sixth increment, 2026-10-26)

Discovery traced Student/Teacher repositories, BaseRepository/PagedList, all actual
Core callers (including teacher/students), DTO/mapping shapes, Core/country table
columns and module response enrichment. StudentDto does not expose Enrollments:
loading every enrollment/class/branch was unused graph materialization. The Core
table instead reads the existing JoiningClass/Branch field, previously not included.
TeacherDto genuinely includes classes/schedules, so removing those collections or
silently limiting them would change the contract. Extend existing BaseRepository
rather than adding a parallel list repository/DTO/table.

ReadPage now counts, selects at most 50 scalar page IDs, probes relations and loads
only the selected graph in one repeatable-read snapshot, preserving PagedList page
metadata and name/name/immutable-ID ordering. It owns only transactions it creates;
caller-owned repeatable-read transactions remain open, and weaker snapshots fail.
Request cancellation reaches these queries and existing root audit-label priming.
Beyond-count/extreme pages issue no graph/probe queries. ReadBounded extends the
existing BaseController for controller-localized problems/no-store without inventing
a hard timeout. School student/teacher lists and the teacher student-list caller use it.

Students keep enrollment-based EXISTS criteria without loading their histories. Class
and year now match the same valid same-school/class-year enrollment, retaining inactive
historical records; separate Any predicates previously matched unrelated placements.
JoiningClass/Branch references are loaded for the existing table. Foreign references
are removed only on detached copies, preserving students/counts and stored anomalies.
Teacher page graphs retain all valid related rows up to 500 school classes and 500 school
schedule rows across the page. Scalar limit-plus-one probes reject larger results
before graph loading with localized PersonListTooLarge (413), never truncate. Reduce page
size/filter, or use the separate detail workflow; an individually oversized teacher
cannot use this list contract. Foreign classes/schedules are excluded and foreign branch
copies sanitized. Schedule year comes from its course's class, not a duplicate Course
year field. No schema, stored field, DTO, index, UI or country rule was added.

Validation: four new focused private PostgreSQL/API tests passed
(`/tmp/dm-person-page-focused.log`); final full Core suite 318 passed, zero skipped
(`/tmp/dm-person-page-full-core.log`), including subsequent transaction ownership and
concurrent teacher-class assertions. Coverage includes 73 tied-name students over 50/23
pages, stable IDs/counts, creation dates, empty/extreme pages, no enrollment graph,
joining-class visibility, combined historical filters, foreign references/history
preservation, cancellation and no tracking. Concurrent registration/class writes
cannot mix count/IDs/graph snapshots. Teacher 500 boundary success uses the real mapper/
serializer/API/country metadata; 501 class or schedule rows fail before account graph
loading, with actual English/Dari/Pashto errors. Foreign class/schedule rows remain
stored but cannot leak or inflate these page graphs.

An initial full-suite run hit PostgreSQL 53200 during simultaneous independent
EnsureCreated schemas; retained server diagnostics explicitly reported exhausted
max_locks_per_transaction. The socket-only disposable Core test cluster now reserves
512 locks per transaction instead of its default 64. No app/live DB setting changed,
and actual concurrent request races remain concurrent. Final 318 suite passes on that
harness; no production error suppression or test skipping was introduced.

Local commits: Core `ffc5ac7`, API documentation `d05ea1f`. Standard rebuild/install
`/tmp/dm-person-page-sync-dotnet.log`; built/API installed DLL SHA256 match:
Core `fc090fbfa2376440e8e39625d67cea65f9423a9b6f58038bb41e38e52c987ba6`,
Abstractions `f5ae3cd102ee880ac6534142768605a40809a7106df93d899914f5cbf4f9febb`,
country `3cd7a188a7b203491a49ca7561afa00f6b9a218a08332a4480ff416d61f7640d`.
No push, live user DB mutation or manual server restart. Frontend source/artifacts are
unchanged since the complete 104-table gate; the existing successful DTO shapes and
country composition remain. Afghanistan integration 106 passed, zero skipped with the
rebuilt packages (`/tmp/dm-person-page-country.log`). See Core docs/PERSON-LIST-READS.md
for exact limits.

All seven overall completion requirements remain open. This closes the discovered
unbounded list-history materialization and count/page consistency gaps, not the
whole read audit. Person detail reads, nested actor mappings and post-read module
snapshot composition still need work. Representative person-list query plans/index
measurements, remaining grade/fee/inventory/lookup reads, other writers/reference
invariants, shared classroom state/jobs, mobile SignalR/country/locale, telemetry and
multi-school load/recovery/deployment evidence remain required.


### Measured person query plans and student search indexes (forty-seventh increment, 2026-10-26)

Discovery inspected the actual scalar-first repository SQL, common email filter,
existing model/migration/snapshot indexes, Core/country numbering and migration
execution. Existing school/name/name/ID indexes already cover ordered first/deep
pages: reuse them. Actual selective substring and email plans still scanned 40,002
student rows. The common email predicate is lower(Email)/Contains, so a raw-email
trigram index alone did not improve it; the first isolated experiment caught that.
Preserve comparisons and current number ownership instead of changing semantics,
adding a computed column, copying country data or creating a parallel search table.

Core StudentSearchIndexes adds one GIN access path over FirstName/LastName/raw Email/
lower(Email), plus the partial school/Core AsasNumber B-tree needed for the numeric
OR branch. The numeric path is in the model/snapshot; EF8 cannot express the GIN
expression with property-only HasIndex, so its narrow SQL migration is authoritative.
Core's existing number is reused; country ministry numbering remains independent.
No new stored field, DTO, search service, country rule or duplicate ordered index.

pg_trgm is required (pre-provision if the deployment role cannot create it). Both
indexes build/drop concurrently outside the migration transaction. IF NOT EXISTS
allows valid partial replay; catalog validation checks readiness/validity/access
method/keys/GIN operators/expression/filter and rejects invalid or differently
shaped names. No automatic replacement/drop of unknown indexes. Failed concurrent
builds need reviewed named-index repair before retry. Down retains data and the
shared extension. Deployment must allow build time, active long transactions and
write/storage overhead; this audit never applied a migration to the live user DB.

PersonQueryPlanTests uses a guarded harness-owned private socket database, real
entities/columns and actual repositories/EXPLAIN (ANALYZE, BUFFERS). Fixture: 40,002
students, 1,002 teachers, 40,002 enrollments and 40,002 schedule rows in two synthetic
schools, 40 pupils per generated class and 40 slots per generated teacher. It covers
first/deep pages, Unicode substring, email, creation range, combined class/year,
number search and teacher schedule pages. Student reads use 3 commands; a 10-teacher
page uses 7 commands and materializes 10 classes/400 slots. Root tenant scope and all
results stay unchanged. Ordinary root ID pages use the existing ordered index
without a sort; selective searches use bitmap index plans with the new paths.

A focused local before/after run (`/tmp/dm-person-query-index-experiment.log`) measured
five-read warm repository means: Unicode 47.43→4.43 ms, email 22.62→4.97 ms, numeric
36.53→4.05 ms. Full-suite run: 54.59→4.66, 22.27→4.63, 42.15→3.69 ms respectively.
Stats were vacuumed/analyzed; measurements exclude HTTP/mapper/module work and
establish no worst-case common/short-term behavior, sustained-write or whole-app
throughput guarantee. Numeric plans explicitly use both the GIN and roll-number
index. No teacher/date index was added without evidence.

Full isolated Core suite 319 passed, zero skipped (`/tmp/dm-student-search-full-core.log`).
The new case also verifies suppressed DDL transactions, actual EF migration execution
on an existing-model fixture, stable-index-OID partial recovery, wrong-definition
rejection, a real failed unique concurrent build leaving an invalid index and its
rejection, and data/extension-preserving Down. The actual data-copy/index experiment
refuses non-harness host/database/user/port combinations. Precommit gates pass.

Local commits: Core `4cec647`, API documentation `9a084bf`. Standard pack/install
`/tmp/dm-student-search-sync-dotnet.log`; installed/built DLL SHA256 match:
Core `32a0dc7405c7515d17230c9ba77c09c1e37fe74d0515ca77ba88dd9278b9ccca`,
Abstractions `5f687b05fa707e9593de687214c1763eda3a004f03db0fe05adb7cf5c0b3a3f6`,
country `58ea8ad6b905fa5192b28eae88c3c7283e712a4e39535230c4795b9e1594efd7`.
No push/manual user server restart/live DB modification. Frontend source/artifacts
are unchanged since the complete 104-table UI gate. Core docs/PERSON-LIST-READS.md
records query/migration scope, reproduction and limitations. Afghanistan integration
106 passed, zero skipped with the rebuilt packages (`/tmp/dm-student-search-country.log`).

All seven broader completion requirements remain open. Student/teacher list plans
now have measured evidence, and the measured selective student-search scan is fixed.
Remaining work includes other editor/durable writers and reference invariants;
person detail/lookup and grade/fee/inventory reads, nested actor mapping and module
snapshot composition; remaining expensive outputs; shared classroom state/jobs;
mobile SignalR/country/locale; telemetry and representative multi-school whole-app
load/recovery/deployment evidence. This two-school repository fixture does not finish
the whole-application load requirement.

### Scoped lookup snapshots and client sessions (forty-eighth increment, 2026-10-26)

Discovery traced BaseRepository/PagedList, Teacher.Lookup, class/course query DTOs,
both controller families, actual teacher/class selectors, AppAsyncSelect, ambient
Axios request options, readAllPages callers and package sync consumers. Reuse the
existing PersonLookupDto, ClassParams, stored Class.Id/Course.ClassId, shared actor
resolver and Core controls. No new stored field/table or country-specific rule.

BaseRepository.ReadSnapshot now shares the existing repeatable-read lifecycle
between graph pages and projected pages. Teacher lookups apply common date/email
filters before the existing three-field projection; counts/page share a snapshot,
request cancellation and stable ordering. Own-school explicit inactive selections
remain resolvable. GETs are no-store, and shared reference permissions do not grant
full teacher-profile access. ClassParams.ClassId narrows existing school/teacher
class and course routes. Teacher saved selections resolve one ID/page rather than
scanning all classes. Preserve assignment/homeroom/year restrictions. Course lists
reuse scalar-first ReadPage, combined scope filters and detached foreign-reference
sanitization. Shared getClassLabel/getPersonName keep shell course rows safe when
invalid foreign references are omitted. School class graphs/details remain open.

AppAsyncSelect scopes its widget, known values and asynchronous phases by immutable
actor plus token/language/resource. Hide old options during render before effects,
cancel defaults/search/selection resolution and reject late callbacks. Inline loader
identities do not refetch, hydration never changes form IDs, and known history is
bounded to 512 while protecting the selected ID. Opaque widget generations avoid
putting credentials into React keys. Existing Core controls/themes are retained.
Ambient GET options capture credentials/cancellation before asynchronous Axios
interceptors, preserve caller headers and explicit tokens, and use no-store/silent
local loading. readAllPages pins original options across awaits and rejects over
200 pages/10,000 rows without returning partial data. Independent HTTP pages are
still separate snapshots; other callers retain responsibility for UI lifecycle.

Release verification found stale SPA lock integrity despite installed tarball swaps.
The SPA/mobile sync scripts now share update-local-tarball-lock.cjs, extending the
existing mobile behavior rather than copying it. It updates only archive integrity
and rejects wrong paths, remote locks, version/name or dependency metadata drift;
metadata changes require normal npm install, without silent peer upgrades. A small
fixture verifies preservation/refusal behavior; seven actual mobile locks also pass.
No mobile source/package rebuild was needed. An interrupted SPA sync caused by
editing the running shell script was rerun completely and finished successfully.

Evidence: final private Core suite 322 passed, zero skipped
(/tmp/dm-lookup-scope-final-core.log), including actual multilingual JWT lookup/class
routes, creation/email/search filtering, coherent count/page under concurrent writes,
transaction ownership/weak snapshot rejection, cancellation and tenant sanitization.
Country integration 106 passed, zero skipped with rebuilt packages
(/tmp/dm-lookup-scope-country.log). The complete 104-table UI/export gate passed
(/tmp/dm-lookup-scope-release-ui.log), including real selector/Axios races in all three
locales, pre-effect stale-label hiding, staff identities/token renewal, bounded cache,
multi-page credential/signal preservation and unsafe course-reference rendering.
Core/country/shell TypeScript and precommit checks pass. React review retained the
existing controls, primitive scope dependencies, callback refs, bounded history and
abort/stale-result guards; no new style system, UI library or automatic retry.

Standard sync logs: /tmp/dm-lookup-scope-sync-dotnet.log and
/tmp/dm-lookup-scope-sync-spa-final.log. Verified 16 local package lock integrities
and all 8,056 installed archive files against current feed. API installed/built
Release DLL SHA256 match:
Core c6e04eceb0817fb0285cd67b33d1f58b5228d05d1083d67c64f6c9f410784d00,
Abstractions 2c46cd0e6e720fbf1745035498f6349107821ad769817abe60fb5b9cf530cc36,
Afghanistan 3f75c0ecbf4638219da1109ba1e630d146d0e938e1cb0fc4ed9ab963e5767bf2.
Local commits: Core 212c322, SPA Core 4ec6647, shell 99ca069c,
Afghanistan SPA lock d7db918, Austria SPA lock 7aa2e60, API docs 928bb70.
No push, manual user-server restart, or live user-database mutation.

All seven broader completion requirements remain open. These changes close the
identified lookup/filter/session holes, not the whole endpoint/editor audit.
Remaining work includes school class/person details, grade/fee/inventory and other
reads, nested actor mappings/module snapshots, remaining durable writers/reference
invariants and expensive outputs, shared classroom state/jobs, mobile SignalR and
country/locale scopes, telemetry and representative multi-school load/recovery/
deployment evidence. Mounted lookup recovery is not a persistent draft system.


### Bounded school class graphs (forty-ninth increment, 2026-10-26)

Discovery traced Class/ClassDto and enrollment/course/subject/book relations,
School/Teacher/Student repository/controller reads, all actual school class/select/
editor/transcript callers, class-table totals and existing ReadPage/ReadBounded.
The school list genuinely uses enrollment and course arrays for totals, so retain
that contract instead of silently returning empty/truncated arrays or storing
parallel count fields. No new persistent field, table, DTO, service or index.

School GetClasses now applies root filters, counts/pages scalar IDs and probes
relations before loading the selected graph. Stable grade/section/immutable-ID
order, common creation filters and all class criteria remain. Existing ReadPage
provides one repeatable-read snapshot and request cancellation for every phase.
AsSplitQuery separates enrollments and courses, avoiding their SQL row product.
Whole-page bounds are 5,000 valid enrollment rows and 1,000 course rows, tested at
and above both limits; a normal 50-class/40-student page fits. Oversize returns
localized ClassReadTooLarge (413) before graph loading, never truncation. Reduce
page size/narrow classes; individually huge classes need enrollment/course flows.
These bounds are not a payload-byte limit or hard deadline.

GetClass now takes schoolId/classId, with school scope in SQL before expansion.
Its existing course/subject/book graph remains, bounded at 1,000 courses. Include
branch/year/homeroom teacher for actual selector/editor labels. Foreign book-backed
subjects, branches and teachers are withheld on detached copies; global books
remain available. List enrollment graphs retain inactive history while excluding
foreign students and mismatched class/year references, without changing storage.
Both school routes use shared localized no-store/problem handling. Caller-owned
repeatable-read transactions remain open; weaker transactions fail. Empty/extreme
pages skip graph/probe work. The shell class table reuses Core getPersonName to
avoid the previous undefined/undefined label when a teacher is unavailable.

Validation: three focused private PostgreSQL/API tests passed
(/tmp/dm-class-reads-focused.log). Full isolated Core suite 325 passed, zero skipped
(/tmp/dm-class-reads-full-core.log). Subsequent stronger serialization assertions
also passed all three focused cases (/tmp/dm-class-reads-boundary.log), including
actual list JSON with 5,000 enrollments plus 1,000 courses and detail JSON with
1,000 courses. Coverage includes 73 tied-order classes over 50/23 pages, creation
filters, foreign IDs, retained inactive history, mismatched years, scoped subjects/
books, no tracking/storage correction, concurrent class/course changes after count,
transaction ownership and cancellation. Real JWT routes return correct no-store
and localized 413 in English/Dari/Pashto. SQL assertions prohibit combined
Enrollment/Course joins and prove oversized pages fail before account graph loading.

Shell TypeScript passes (/tmp/dm-class-reads-shell-tsc.log), and the existing real
selector/course/class render test passes (/tmp/dm-class-reads-ui.log), now covering
withheld class teacher/branch references. Shared SPA package source is unchanged
since increment 48's complete 104-table UI/export gate; no repack required for the
shell-only formatter change. Core/shell/API precommit gates pass. Afghanistan integration also passes all 106
tests, zero skipped, against the rebuilt packages (/tmp/dm-class-reads-country.log).

Local commits: Core 9de306f, API documentation 7192ff5, shell 0986c8c2.
Standard backend rebuild/install: /tmp/dm-class-reads-sync-dotnet.log. Installed API
DLL SHA256 matches built Release:
Core 1c8f3ba25832da68ccb07e948718b7a5c7d06a4b7dcee0c20be3acffab1b0e7b,
Abstractions 415465545ca0ed57f069e6f9c9f442237a7c5e8b0a1be4ed4cb2b4ee68826c39,
Afghanistan 6f0e5d2d1295086f75cd62f283e1315733e9975f61ce52dae244f4769050478c.
No migration, push, live user-database mutation or manual user-server restart.

All seven broader completion requirements remain open. This closes the identified
school class SQL expansion/snapshot/scope gaps; it does not prove every class-related
endpoint or caller correct. Student class/schedule reads remain separate audit work,
as do scalar class summaries, nested audit-label mapping, person details/module
snapshots, grade/fee/inventory and other reads/writers, shared classroom state/jobs,
mobile SignalR/country/locale, telemetry and multi-school load/recovery/deployment.


### Student roster scope and complete weekly grids (fiftieth increment, 2026-10-27)

Discovery traced school/teacher/student schedule controllers, Schedule/mine and
children fan-out, raw mobile student schedules, SPA grid loaders/tables, parent
links, Student GetClass, existing roster predicates and Core formatting. Found:
Student/schedules omitted StudentId and trusted a supplied class ID; Student/class
loaded classmates' enrollment records; weekly fan-out silently took only the first
server page per class; school/teacher flattened partial lesson pages into grids.
Reuse DailyAttendanceWriter.ActiveRoster, UserParams.StudentId, existing models/
DTOs, ReadPage/ReadSnapshot and Extensions.FlattenSchedules. No new table, stored
field, DTO, index, roster service or country-specific rule.

Student GetClass now scopes school/student/year in SQL through the existing active
roster (active school/class/student/enrollment and equal class/enrollment year).
Return one deterministic grade/section/ID reference with branch/year, without
classmates, course collections or teacher profiles. Historical records stay stored.
Student/schedules always forces authenticated StudentId/year; optional class IDs
can only narrow this scope. Raw pages use one count/IDs/graph snapshot, immutable
day/period/course/ID order, common creation dates, cancellation/no-store and the
existing 50-root DTO contract. Foreign branch/subject-book objects are withheld on
response copies; global books remain valid.

SchoolRepository.FilteredSchedules shares raw and complete-grid root scope. Parent
scope adds a current active same-school parent/child relationship to ActiveRoster;
no unbounded child/class ID arrays or per-class fan-out. GetWeeklySchedules probes
at most 1,001 scalar IDs before any graph and rejects more than 1,000 matching
active schedule/course/class rows with localized ScheduleReadTooLarge (413).
Read IDs/references in one repeatable-read snapshot. Caller-owned strong transactions
stay open; weak transactions fail. Common creation filters narrow original schedule
rows. School/teacher metadata now describes one complete seven-day grid, regardless
of requested page or size. All four grid routes use no-store/cancellation/problems.
Empty grids retain the existing seven-day contract.

Extensions.FlattenSchedules now shares one tuple-based cell pipeline for entity
and DTO inputs. Weekly routes use reference-only entities directly, avoiding
unused person/audit DTO mapping and its queries. Core ClassLabels retains localized
section/grade/type/shift/branch identities, all ten periods and concurrent lines.
Existing academic-report DTO formatting remains compatible. This change does not
optimize publication history or claim nested mapping elsewhere is complete.

Validation: initial four focused private PostgreSQL/API cases pass
(/tmp/dm-schedule-reads-focused.log). Final full isolated Core suite 329 passed,
zero skipped (/tmp/dm-schedule-reads-full-core.log), including stronger foreign
branch/book and localized section assertions. Cases cover 70-slot complete weeks,
50/20 raw pages, date filters before flattening, unrelated class IDs, inactive and
foreign placements, parent-link removal, no classmates/tracking/credential graph,
concurrent ID/graph updates, cancellation and transaction ownership. Real JWT tests
exercise raw/class/mine/children/teacher/school routes in English/Dari/Pashto; all
four complete routes reject 1,001 lessons with controller-localized no-store 413,
and actual 1,000-lesson grid JSON is complete. A grid limit failure executes only
the scalar probe. School/teacher page metadata no longer advertises partial weeks.

Local commits: Core fce8966, API documentation 15b1803. Standard backend pack/install
completed (/tmp/dm-schedule-reads-sync-dotnet.log). Afghanistan integration passes
all 106 tests, zero skipped, against rebuilt packages (/tmp/dm-schedule-reads-country.log).
Precommit build/localization/enum/isolation/route checks pass. Installed API DLLs
match built Release SHA256:
Core bdf6da721ba42a287cb4ab850da53a25a25fadd557516c089d9c3e52d4a53401,
Abstractions 7710f93e220801deb86db35694a6ee0206e9d54260cf728041c0fa0d39f383b1,
Afghanistan cc98c5f5e7759c8807e061f05d03606a35c75773bc3897e88ff1ae8161144d09.
No migration, push, manual user-server restart or live user-database modification.
SPA/mobile source/artifacts are unchanged; this is backend contract/runtime evidence,
not a new browser/device verification claim. Ship Core/API together for internal
repository signature changes.

All seven broader completion requirements remain open. Next discovered client gap:
SPA student/parent timetable screens mirror useScheduleViews data into unscoped local
rows after mount-only reads, and the table's date filters act on synthetic grid row
dates rather than source lesson timestamps. Mobile student schedules also consume
only one raw page and render a legacy time shape. Finish their scoped cancellable
reads/filter source/presentation through Core instead of copying state into hosts.
Other remaining reads/writers/reference invariants, scalar class summaries, nested
actor mappings/module snapshots, shared classroom state/jobs, mobile SignalR and
country/locale, telemetry and representative multi-school load/recovery/deployment
remain required. No whole-application completion is inferred from this focused suite.


### Scoped SPA timetable sources and React-owned select options (fifty-first increment, 2026-10-27)

Discovery traced both shell timetable screens, useScheduleViews/useApiRequests,
ScheduleTable, AppTable's actual paged/filter/empty/cancellation flow, request options,
Core actor resolver, shared filter mapping and Select2 implementation. Reuse the Core
source pattern (as in attendance summaries), existing ScheduleData, API options,
ResponseResult, filterTableRecords, controls and the server's seven-day contract.
No new persistent field, table, DTO, request service, UI control or country rule.

ScheduleTable.source="mine"/"children" now owns the remote-view composition. AppTable
is the only row cache; the hook retains at most seven day labels and the period-count
metadata, not a second copy of the grid. Shell screens only choose the source/card.
API requests pin credentials/signal/no-store before awaits and validate a complete
zero-or-seven-row grid with unique day labels and string period cells. Object-valued
cells cannot reach rendering. Complete response order supplies stable Saturday..Friday
ordinal row IDs; day labels are presentation, not filter identities.

Creation ranges reach the original lesson query. The day criterion uses the shared
Core filter helper over the complete result, with explicit accessor/options to avoid
the legacy global day-to-classId mapping. Return complete one-page metadata so
AppTable never filters synthetic epoch grid dates locally. All controls remain in
its draft/Apply/Reset panel. Reset and empty results retain the filters; a shared
button provides explicit refresh and recovery. Eight/nine/ten-period columns derive
from bounded metadata. Opaque request-generation keys replace the private table cache
on actor/kind/token/language changes, cancel pending work and reject late responses.
Applied criteria remain for the same actor/kind through renewal/locale changes and
clear for another actor/kind. Unapplied drafts and sort/interaction state reset with
that cache; there is no cross-reload draft persistence or automatic retry. Local
report ScheduleTable.data remains provider-free and does not acquire an HTTP loader.

An added empty-result transition exposed a real shared DOM-ownership failure:
Select2's ArrayAdapter replaces native option nodes that React still owns. Shrinking
seven choices to zero then caused React NotFoundError during reconciliation. Inspected
the installed plugin's convertToOptions/replaceWith and all useSelect2 callers (one
Core wrapper). AppSelect2 now owns all option DOM in React, including translated
nonselectable loading/error choices. useSelect2 omits plugin data arrays so the native
select adapter enhances those existing nodes. Existing content-keyed configuration,
callback refs, modal anchoring, accessibility/theme and no-blink Formik behavior stay.
This fixes the actual Core primitive for every form/filter consumer, not a timetable
workaround or duplicate control.

Evidence: actual Core table/request/select components and both shell viewers pass
English/Dari/Pashto scope tests (/tmp/dm-schedule-view-scopes-release-final.log).
They cover one settled request per action, drafts versus Apply, combined source dates
and ordinal day, Reset, empty results with filters, same-token different actors,
renewal/locale changes with applied criteria, pre-effect stale-row removal, pinned
credentials/no-store/signals, old-response suppression, unmount cancellation, explicit
503/malformed/403 recovery, no automatic retry/global-loader activity, ten periods and
local snapshots without a loader provider. The new case is included in standard
check-data-flows and the full 104-table UI/export gate, which passes
(/tmp/dm-schedule-views-ui-release.log).

Real Chrome checks also pass four viewport/language/theme combinations (Dari dark
1280/320, Pashto dark 360, English light 1280): native option-node identity through
label changes, shrink/empty/loading/error/restoration, one explicit change callback,
existing Formik popup stability, bell controls and direct Hijri birth-year selection.
Log /tmp/dm-schedule-select-browser-final.log; rendered artifacts at
/var/folders/60/wxvmhsvx2kn6_msk6zgy1qyc0000gn/T/digitalmaktab-picker-f7PXbz.
The existing browser harness was extended rather than introducing another driver.
React review retained shared controls, stable source identities, bounded metadata,
refs for criteria/generation, scoped cancellation and no row-mirroring effects.

Core, Afghanistan/Austria SPA modules, shell, mobile country and both mobile app
TypeScript/localization/precommit checks pass. Mobile app hooks also run the shared
runtime/attendance regression gate successfully. Labels ship in Core English,
Afghan Dari/Pashto and all three mobile bundles. Standard rebuild/install logs:
/tmp/dm-schedule-views-sync-spa.log and /tmp/dm-schedule-views-sync-mobile.log.
Verified all 16 local package lock integrities and 8,056 installed archive files
against current feed, plus the five changed Core timetable/select dist files against
shell and both SPA countries. No server/Metro restart, live database mutation or push.
No backend source/schema change in this increment; deploy the complete-grid backend
from increment 50 before/with these viewers. No new whole-device/live-app proof is
claimed from controlled transport and local Chrome fixtures.

Local commits: SPA Core 60e9e36, shell c3f1f377, SPA Afghanistan 5698df3,
SPA Austria lock 211b47d, mobile country c9c7020, parent lock 9c5feaf,
student lock 67a5cf7. Remaining work includes mobile student's raw/legacy schedule
presentation, source-date semantics for local composite grids, other AppTable/account
lifecycles and readonly endpoint audits. All seven broader completion requirements
remain open, including remaining durable writers/reference invariants, expensive
reads/outputs and nested mapping/module snapshots, shared classroom state/jobs,
mobile SignalR/country/locale, telemetry and representative multi-school
load/recovery/deployment evidence. This does not redefine the overall completion bar.


### Complete shared mobile timetable views and active-theme primitives (fifty-second increment, 2026-10-27)

Discovery traced both native timetable screens/hooks/datasources/DTOs, mobile Core
HTTP/session/query/attendance patterns, SDK/country/context contracts, native Card/
Text/RTL/theme primitives and the actual runtime harness. Student used one raw page
and assumed ScheduleTime.startTime/endTime objects, while the server stores a period
enum. Parent omitted periods nine/ten and sorted localized labels with an English day
list. Both text/card primitives also held static light colors. Reuse the existing
complete-grid endpoints, country.code, theme/RTL, React Query/session isolation and
native controls. No new stored field/table, backend contract or credential store.

Mobile Core readMobileWeeklyTimetable validates a complete zero-or-seven-day wire
projection of existing FlattenedScheduleDto, preserving server order and concurrent
lines and normalizing legacy optional later periods. It pins Accept-Language and
forwards cancellation; malformed, duplicate-day, partial or object-period grids fail
through the normal error flow. useMobileWeeklyTimetable namespaces queries by
kind/locale/country code, disables automatic retry and uses the existing private
session provider. It exposes only teaching days for the native list; a completely
empty week yields the standard empty state. Country keys are query isolation, not
country authorization or a new runtime country-selection implementation.

Move the private parent day-card logic into MobileTimetableDayCard, a platform-neutral
Core fragment over injected existing Card/Text/Row components. Hosts retain native
screens/lists/pull-refresh/loading/error/theme/RTL integration. Both use the same
reader/fragment and localized period ordinals, never fabricated clock times. Remove
unused host schedule transports and obsolete Schedule/clock/teacher/flattened DTO
copies after confirming there are no other callers. No React Native dependency or
native screen implementation is added to mobile Core. Country period labels reuse
the existing SPA schedule.period.label contract in all three mobile bundles.

The two identical static typography definitions now live in Core mobileTextVariants
and mobileTextColor; host AppText keeps native fonts/weight/RTL and caller overrides
but reads the active theme. AppCard likewise reads active surface/border/heading
border tokens. This corrects dark titles/default text through the actual primitive,
not a timetable-specific style workaround. Other existing static-color native screens
and country-provider activation remain separate audits.

The existing mobile-runtime harness was extended rather than adding another runtime
fixture. Final gate passes (/tmp/dm-mobile-timetable-country-gate.log), as do producer/
both host precommits. It verifies complete 70-slot weeks including ninth/tenth periods
and concurrent lines, legacy eight-period input, malformed/partial/duplicate grids,
invalid locale/header injection and aborted reads. Actual transport/Query tests prove
pinned language, obsolete locale/country cancellation and late-result rejection,
matching-country-only cache reuse, 503 manual recovery/no automatic retry and unmount
cancellation. The query probe subscribes to the error state it asserts, matching
actual React Query tracked-property behavior.

Both actual timetable screens and real native AppText/AppCard render with presentation
adapters in English/Dari/Pashto. Assertions cover server day order, localized period
10, concurrent text, no Unknown/object output, RTL rows, dark title/body/card colors,
light theme replacement without any extra request, exactly one request per locale,
empty weeks and errors. Existing attendance/runtime/auth/storage/capacity/normalization
checks still pass. These are controlled native adapters, not emulator/device or live
API/load tests. Existing backend authority and complete-grid limits remain covered by
increment 50's private 329 Core/106 country suite; no backend code/schema changed here.

Local commits: mobile Core e61f90e, mobile country 9626dda, parent 6673bf1,
student e033654. Standard mobile pack/install completed
(/tmp/dm-mobile-timetable-sync.log). All producer/host TypeScript, locale coverage and
precommit checks pass. Verified 16 local package lock integrities and all 8,068
installed archive files against current feed, with timetable/typography dist files
matching both hosts. No API/Metro restart, push or live database modification. Backend
complete-grid endpoints from increment 50 must be deployed before these clients.

All seven broader completion requirements remain open. The student raw-page/legacy
clock-shape and parent eight-period/localized-day-sort gaps identified in increment
51 are closed for the actual mobile viewers. This does not repair every mobile
localized query, SignalR lifecycle, native static-color screen, runtime country
activation or device behavior. Remaining endpoint/editor/reference audits, local
composite-grid source dates, nested actor/module snapshots, shared classroom state/
jobs, telemetry and representative multi-school load/recovery/deployment evidence
still need completion against the original whole-application requirements.


### Coordinated retention batches and device refresh races (fifty-third increment, 2026-10-27)

Discovery traced the actual notification, audit, device and password-reset reapers,
credential writers, recurring checkpoints and startup locks. Existing tables and
transaction advisory locks represent the need; no job/receipt table or stored field
was added. Core DatabaseReaper now coordinates cooperating hosts by physical table,
selects at most 250 scalar IDs per read-committed transaction and commits each batch.
A busy host returns committed progress without queueing. Failure/cancellation rolls
back the current batch while preserving earlier progress. All four existing policies,
including impersonation history and nullable-date exceptions, remain unchanged.

The DELETE target retains the original expiry predicate as well as selected IDs.
PostgreSQL rechecks that predicate after waiting for a concurrent row update, keeping
a newly refreshed device or newly read notification. DeviceTokenRepository.Register
also checks the affected refresh count: if cleanup deleted its previously read row,
it revalidates the account and uses the existing creation path under the existing
fingerprint lock. It cannot acknowledge a missing binding. Normal shutdown cancellation
no longer records a failed reaper health run. There is no automatic mutation retry.

Five real PostgreSQL cases cover the actual four job implementations, 620-row backlogs,
two notification schools, all retention exceptions, scalar reads and at-most-250-row
DELETEs. Independent sessions prove busy-worker exclusion, committed-batch survival,
injected rollback/resumption and rejection of dirty/caller-transaction contexts.
Concurrent refresh/read-mark races observe actual pg_stat_activity Lock waits before
releasing the writer. Cancellation of a blocked DELETE releases its transaction advisory
lock, preserves the row and allows a subsequent worker to resume. The registration
race deletes the binding between its actual SELECT and refresh; the returned replacement
is persisted, current and reused by the next registration. These are independent DB
sessions/real DI jobs, not a two-API-process fleet or production load test.

Core full isolated suite: 334 passed, zero skipped
(/tmp/dm-database-reapers-final-core.log). Rebuilt Afghanistan integration: 106 passed,
zero skipped (/tmp/dm-database-reapers-country.log). Producer/API precommit gates pass.
Local commits: Core 253c6ff, API documentation 4cce017. Standard clean/build/pack/install
completed (/tmp/dm-database-reapers-sync.log). Built/installed SHA256 match:
Core 30e16a7b9151f5ba9075e2ebf9358bede1553d176fd436df22b0d9d072dbda16,
Abstractions c9a9e46fe0d2052ca6372d7c291b87ff2256741d2c9225e4538cf92082f76afe,
country 6e3bcea21126938bb2969b9ca3d4b4e41d920fa07a903e8068d9fe8912df0247.
No frontend changes, user server restart, push or live database modification.
Deploy updated workers together; old paths do not honor this coordination contract.

All seven broader requirements remain open. This provides row/transaction bounds,
not a hard whole-sweep deadline, tenant fairness, immediate failover or exactly-once
daily execution. Sparse/global retention query plans and indexes still need measurement.
File/message cleanup, backups, shared classroom authority, other endpoint/editor audits
and whole-app multi-school telemetry/load/recovery remain separate unfinished work.
See Core README and DatabaseReaperTests for the verified contract and PostgreSQL
read-committed DELETE/transaction-lock references.


### Measured global retention access paths (fifty-fourth increment, 2026-10-27)

Discovery traced the actual global ID selectors, existing recipient/read/creation,
school/audit-date and reset-user/expiry indexes, model/snapshot and migration history.
The existing two-field nullable device fallback already represents its retention
date. No expiry field, table, country specialization or parallel cleanup service is
needed. Extend DatabaseReaper with optional date/ID ordering for measured paths;
other callers retain ID order and every DELETE keeps its original eligibility.

A guarded private real-model fixture contains 60,001 rows in each of Notification,
Audit, DeviceToken and PasswordResetToken (240,004 total), with two school scopes
for notifications/audit. Actual previous queries are explained for sparse eligible
rows and no eligible rows. Read-notification and original OR-device selectors scanned
the whole table. The other three used their existing composite indexes efficiently
in this fixture; no overlapping unread/audit/reset index was added without evidence.
This does not establish their behavior with many distinct recipient/account/tenant
prefixes, sustained writes or all backlog distributions.

Core migration 20261027010000_RetentionReadIndexes adds only partial
Notification(ReadAt,Id) WHERE IsRead and expression
DeviceToken(COALESCE(LastSeenAt,CreationDate),Id). The property index is declared in
model/snapshot; EF8 cannot model the expression key, so its migration is authoritative.
The read and device jobs order by these dates and immutable ID, preserving all
retention windows. Device COALESCE selects exactly the original OR row set, including
recent last-seen/old creation, old last-seen/recent creation and both-null cases.
No duplicated stored date or module-owned copy. Before/after sparse warm local SQL:
read 3.125 to 0.038 ms; device 4.743 to 0.025 ms. Empty read 3.152 to 0.009 ms;
empty device 4.509 to 0.014 ms. These one-plan measurements exclude HTTP, mapper,
transport, fleet/write contention and capacity claims. Actual shared helper SELECTs
also use the expected index without a table scan/sort for sparse and full-backlog
cases, retaining the 250-row limit (/tmp/dm-retention-plan-final-focused.log).

Build/drop concurrently with suppressed migration transactions. Catalog verification
checks validity/readiness/table/B-tree/key/order/operators/filter. Valid partial
replay preserves the first index OID; incompatible names and a genuinely failed
concurrent unique build are rejected for reviewed repair. No automatic unknown-index
drop/replacement. The test executes EF's real migrator on an existing schema, then
Down, verifying all 240,004 records and original notification index survive. Existing
writers remain compatible; allow startup migration build time/storage/write budget
and long-transaction effects before readiness. No extension/configuration required.

Six focused plan/retention-race cases pass. An initial full run had 334 passes and
one failure in the existing daily-attendance index-plan assertion. Its cause remains
unconfirmed. That assertion now retains the complete plan on failure rather than
truncating it; no production attendance behavior/index was changed or forced. The
14-case attendance suite passes (/tmp/dm-retention-attendance-diagnostic.log), and
the subsequent full isolated Core suite passes all 335 tests, zero skipped
(/tmp/dm-retention-index-full-core.log). Retain this intermittent-plan observation
for the broader query/load audit rather than treating a rerun as a root-cause fix.
Producer/API precommit Release/Debug/locale/enum/health/isolation/403-route gates pass.

Local commits: Core 546f3cc, API documentation 9122ab0. Standard clean/build/pack/
install completed (/tmp/dm-retention-index-sync.log). Rebuilt Afghanistan integration
passes 106 tests, zero skipped (/tmp/dm-retention-index-country.log). Built and
installed API SHA256 match:
Core 4bb83180cb12d10b23b8577f877347e749333715294afecc0a957c02242005b8,
Abstractions 922cf7445a01eb1d3eb49bf6e4309f032d264b16e497d9d9fb0941f44af40d73,
country d6b3b9881ba86add363e27fa7bf6575251247eaf9113509e86a02aa2b20cc976.
No frontend source/package changes, server restart, push or live DB modification.
The user must restart the API to load the installed packages/apply normal migrations.
Shared classroom state, remaining side-effect jobs/backups, endpoint/editor/reference audits and
representative multi-school telemetry/load/failure recovery still need completion.
All seven broader requirements remain open; this step closes the two measured
retention selection scans, not the whole query or multi-instance job requirement.

References: [ordered indexes with LIMIT](https://www.postgresql.org/docs/14/indexes-ordering.html),
[partial index matching](https://www.postgresql.org/docs/14/indexes-partial.html),
[concurrent builds and failed-index recovery](https://www.postgresql.org/docs/14/sql-createindex.html).


### Shared private-call authority reads (fifty-fifth increment, 2026-10-27)

Discovery traced ClassroomState root-family epochs/gates/maps/capacity/expiry,
ClassroomConnections local account bindings/abort callbacks, ClassHubAccessFilter,
ClassroomAudience/Delivery and notification Redis registration. Current rooms are
still authoritative only per host; transport-only routing would split that authority
and the audience would omit remote peers. Shared ownership, connection presence,
fenced expiration/recovery and publication ordering must be designed together,
including root-to-root moves, breakout validation before locking, and the existing
global local-map disconnect scan. This work does not enable Redis for ClassHub or
claim that a dictionary snapshot alone satisfies the multi-instance requirement.

The delivery audit found repeated own/peer queries for the same legacy role-less
private-call pair. Extend the existing ClassHubAccessFilter lookup rather than add
an identity service/table, DTO contract or cache. DirectRoomAuthority parses the
same two IDs and queries all five existing account tables in one UNION ALL/snapshot
(at most ten scalar rows). Each ID must resolve globally to exactly one active
identity before school comparison. Both must belong to the same school; the result
matches immutable ID/actual permitted role, never a name or caller-supplied role.
A bounded grant read covers either/both staff participants. Shared CallGrants now
owns the existing classroom messages.send predicate for invocation, pair authority
and actual recipient membership checks, removing copied expressions.

Admission reuses the pair query before and after root-gate waits; each delivery
batch resolves a thread once rather than querying own/peer for each socket. Actual
recipient active-school/role/security-stamp checks and impersonator validity remain
separate and current. There is no cross-publication authority cache or unchecked
fallback after failure/ambiguity. Generic caller controls and course-roster delivery
retain their distinct existing behavior. A valid private-call message to two
recipients performs three pair queries (two actor validations and one shared
audience check), rather than the previous eight separate identity queries.
This is query-count evidence, not an HTTP latency/throughput or fleet capacity claim.

The real-socket regression injects a foreign-school identity collision immediately
before the audience authority query, after sender authorization. Neither recipient
receives the publication. Inactivating the collision permits a fresh later message.
An injected audience authority-store failure likewise supplies no unchecked delivery;
an explicit later publication recovers. Pair parameters stay at two IDs, and the
valid send uses one actual-recipient membership query for both sockets. Existing
revoked stamp/actual-role/staff-grant/impersonator/course/overload/cancellation tests
pass. The test uses InvokeWithEvents for sender echoes because ordinary Invoke
consumes events while awaiting completion; the initial test's missing-echo wait was
a harness-observation error, not suppressed valid delivery.

Focused socket/invocation suite: 12 passed, zero skipped
(/tmp/dm-classroom-direct-focused.log). Full isolated Core suite: 336 passed, zero
skipped (/tmp/dm-classroom-direct-full-core.log). Core/API precommit Release/Debug,
locale/enum/health/isolation and 403-route gates pass. Local commits: Core 906b6bb,
API documentation 48a0cee. Standard clean/build/pack/install completed
(/tmp/dm-classroom-direct-sync.log); built and installed API DLL SHA256 match:
Core afaecd8036efa8aa0a0cf0cbb94b50915f9bf708f37b937ddf069cb94aec968e,
Abstractions a87782495d88442f433b671ba0aa5a520af6b6cd57e868b0ee7998dd66e564b9,
country e40bf41e4e3cead6c5dc988f44c72702e85353b66bd54fcf584f861ab42e9488.
Rebuilt Afghanistan integration: 106 passed, zero skipped
(/tmp/dm-classroom-direct-country.log). No schema/configuration/frontend change,
external send, user server restart, push or live DB modification.

All seven broader requirements remain open. In particular, shared classroom state
and routing remain unfinished, along with side-effect jobs/backups, remaining
endpoint/editor/reference audits and reproducible whole-app multi-school load,
telemetry, failure recovery and deployment evidence. The repeated private-call
identity-read path is consolidated; it does not stand in for those requirements.


### Actual-process mixed workload and cold-policy corruption fix (fifty-sixth increment, 2026-10-27)

Discovery compared the existing isolated HTTP builders with the actual Program
composition. Those fixtures pre-register role policies and cannot establish that the
real host's singleton lazy policy provider is safe on cold concurrent requests.
The new root-only console harness references the API/package graph and invokes its
entry point in independent child processes, preserving its application identity and
actual API runtimeconfig (all three measured process lifetimes use server GC). No API startup test branch, copied DI/
auth/controllers/repositories, alternate domain DTOs or persistent field/table was
introduced. Only outbound mail is replaced before DI publication by a fail-closed
host-building diagnostic hook. The API's existing push/SMS/payment no-ops remain.

A shell owns fresh socket-only PostgreSQL, fixed harness DB/user identity and marker,
private content/key roots and cleanup. Child environments exclude developer app
settings/credentials; LoadVerification skips .env/demo seeding, uses random loopback
listeners and real production-path middleware/JWT validation. DB/key/listener guards
fail before serving if settings escape the fixture. Failure retains bounded private
logs; only recorded child processes/private PostgreSQL are stopped. Schema bootstrap
uses current real Core/country models plus actual expression-index migrations before
recording Core history. Actual startup coordination/forward repair/country schema
startup run, but this is not legacy/fresh-install migration-chain verification.

The initial real-host mixed run reproduced HTTP 500: AuthorizationPolicyProvider
called AuthorizationOptions.AddPolicy concurrently while another request read its
ordinary dictionary. The stack identified Dictionary.TryInsert and GetPolicyAsync.
Core now compiles the existing catalogue once during singleton construction and
inherits read-only default lookups. Explicit registered policies win; case-insensitive
names, exact role requirements, default/fallback and unknown-name rejection remain.
No second cache or request-time dictionary writes. Configured role-policy changes
now require restart consistently; staff grants remain live in their DB/JWT path.
Two new tests cover 10,000 parallel configured/unknown lookups, ready-at-publication
catalogue, explicit/default/fallback precedence and startup snapshot behavior.

The reproducible actual-process workload has four schools (two Austria/two Afghanistan),
1,600 pupils/enrollments, 40 full classes, 1,600 fees and 8,000 attendance marks.
It uses existing calendar providers/year plans and creator/updater metadata to exercise
audit-label reads. It pins one civil date and derives valid academic bounds rather
than assuming the new Gregorian academic start already happened. Twelve workers mix
ordinary list/dashboard/fee/attendance reads, concurrent duplicate registration,
payment and attendance intents, with reports/templates/ZIP exports under pressure.
After pressure it verifies explicit same-intent recovery/replay, competing profile
versions, real XLSX template/fill/multipart import/replay and complete scoped exports.
Foreign person/report reads must be 404; ZIP students must all belong to the caller.

The financial recovery test holds the actual target fee row, observes host A's
PostgreSQL Lock wait, terminates only A, releases the row and explicitly recovers the
same intent on surviving B. A replacement process on a fresh port must replay that
result and all prior accepted intents. Persisted results: 402 pupils/enrollments per
school, exactly 11 classes, maximum 40 pupils/class, zero capacity/duplicate-placement
violations, two selected-day marks per school and one persisted winning profile edit
per race. AT schools have zero Afghan person profiles; each AF school has three.
Each ordinary payment is recorded once; the interrupted extra intent is recorded
once too (first school: two payments/160 paid, others: one payment/150).

The final local run completed 6,844 pressure requests in 10.028 seconds, with 6,842
2xx successes and two structured 503 attendance admissions; explicit recovery succeeds.
There were no unexpected 5xx. Four competing profile edits win (204), four conflict
(409). Student-list p50/p95: 13.36/17.74 ms; dashboard: 6.12/8.79 ms. The measured
682.26 successful requests/second is this short synthetic local run only, not a
supported production traffic/user count or SLA. Other operation/status/byte/latency
summaries, assembly versions/SHA256, driver hashes and production Meter snapshots
are in [baseline.json](tests/DigitalMaktab.Api.LoadHarness/baseline.json).

Fixture quotas: per-process 64 active requests/16 per school, expensive 2/1, DB pool
24 per API host; shared per-IP/per-endpoint limits 500/second and 10,000/minute.
These are explicit test settings, not operational recommendations. RuntimeProbe
bounds series to 256 and retains only route/method/status/reason tags. A dead host's
last active sample can be stale; do not sum it with replacement-host gauges. No
password, JWT, key XML or response body enters the report. The driver caps responses
and the student archive it inspects; these are verifier guards, not new server-wide
backup/output bounds.

Core full suite: 338 passed, zero skipped (/tmp/dm-policy-catalogue-full-core.log).
Afghanistan integration: 106 passed, zero skipped (/tmp/dm-policy-catalogue-country.log).
Actual-process run passes (/tmp/dm-full-api-load-final.log); private DB guard refusal,
Python syntax, shell syntax and diff checks pass. Core/API precommit gates pass.
Local commits: Core 8a7bc38, API documentation d328668. Standard clean/build/pack/install
completed (/tmp/dm-policy-catalogue-sync.log); built/installed API DLL SHA256 match:
Core ce043c9ad1007e9939e9175fa92065a1d5c5a9aaf7c9d9e3259373b79e4ae78a,
Abstractions c29536f93acd78cf85f6c9d3f9df57f637abc9b9f812a2f1a9e32e5b512987cf,
country 05120be332e07aeb4f3a39a3cd872f824cc86cb23cd24f77fcd8ce2a425cda0c.
No schema/client/frontend change for the policy fix, live DB modification, manual user
server restart or push. Restart all API workers to load the fix and clear old policy
maps. The executable/readiness processes in this test are private, not user servers.

All seven broader completion requirements remain open. This establishes an actual
multi-school TCP workload and process-loss recovery baseline, not a long soak,
large-binary/browser/native/provider or full deployment test. Production telemetry
collection/export/dashboard setup, other endpoint/editor/reference and output audits,
shared classroom authority/routing, remaining side-effect jobs/backups and broader
operational recovery/deployment verification still need completion. Do not close the
whole observability or multi-instance requirement from this verifier's results.


### Bounded streaming backup artifacts (fifty-seventh increment, 2026-10-27)

Discovery traced IBackupService, BackupController, nightly work, mapped-school
reader, the existing Afghanistan contributor, all byte[] callers and current ZIP
consumers. The old flow eagerly loaded ten legacy tables, all Core tables and all
module tables, then duplicated its in-memory ZIP into another byte array. Shared
RequestCapacity only governs HTTP, so it cannot cover scheduled work/file lifetime.
Extend Core's existing service/contributor contract with one query-streaming writer,
prepared artifact and process gate. No persistent table/field or parallel format.

PrepareSchoolAsync serializes no-tracking IQueryable tables sequentially into a
private random DeleteOnClose file inside repeatable-read; commit and ZIP completion
precede exposure. Afghanistan supplies its existing country root/person predicates
through the same writer. Activation and format 2 (including legacy flat/core aliases,
manifest keys, entries and secret-checkpoint exclusions) stay compatible. Aliases
consume budget too. Old eager contributors fail closed until updated, not fallback
to unchecked ToList calls. The public four-argument constructor stays compatible;
legacy byte[] export has an additional 16 MiB allocation cap, and old assembly/
country list adapters have combined row caps.

Validated BackupExport defaults: 500,000 rows, 256 entries including manifest,
256 MiB cumulative JSON, 128 MiB ZIP, 120-second cooperative lifetime, two active
artifacts per process/one per school. A prepared download holds its slot through
stream disposal or expiry. Cancellation/error cleans files, snapshot and admission;
expiry also aborts HTTP response writes. Oversize is localized 413; admission,
timeout and unavailable errors are localized 503 with Retry-After: 5; all are
no-store and no partial ZIP is returned. Limits don't preempt a huge individual
value, arbitrary module code or synchronous serializer/ZIP cleanup.

Nightly work pages 100 active schools using existing native UUID keyset comparison,
disposes each school's scope, copies the completed ZIP into a private same-directory
temporary file, closes it and atomically renames over the destination. Failure or
cancellation preserves the prior backup and removes its own temporary copy. Prune
only after publication. Shutdown propagates without counting as a failed school;
failure notification recipients page 100 active roots. Cross-host job ownership,
shared storage/offsite capacity, filesystem durability, crash-temp recovery and
restore verification remain open; a database lock with host-local files is not a
substitute for their design.

Validation: 344 Core tests pass, zero skipped, including six backup tests using real
private PostgreSQL sessions (/tmp/dm-backup-full-core.log). Verify early row stopping
(two pupils materialized out of 100 with a one-row limit), no tracking, tenant and
format compatibility, repeatable-read exclusion of a concurrent commit, all four
size budgets plus legacy byte cap, clean transactions/files/gates after failure,
download admission, expiry/caller cancellation and subsequent recovery, localized
HTTP problems and preservation/cleanup on failed/canceled nightly publication.
Afghanistan integration: 106 passed, zero skipped (/tmp/dm-backup-country.log),
including AF/AT activation/scope and country rows consuming the shared row budget.
Standard clean/build/pack/install and API build pass (/tmp/dm-backup-sync.log).
Actual-process workload passes (/tmp/dm-backup-full-api.log): 6,788 pressure requests
in 10.045 seconds, 6,786 successes and two expected structured 503s; all four ZIPs
under pressure and all four complete post-import ZIPs succeed. The verifier now
checks no-store/type/known Content-Length, complete format-2 manifest, tenant and
country activation as well as all 402 committed students. It accepts only the
endpoint-specific localized backup overload codes/Retry-After or existing request
admission shape. Profile races remain four 204/four 409; process-loss recovery,
registration/payment replay and persisted capacity/tenant invariants all pass.
Student-list p50/p95 13.33/18.92 ms, dashboard 6.00/8.55 ms; backup p50/p95
36.44/64.43 ms after pressure and 178.83/377.03 ms during pressure. These are local
synthetic observations, not a production capacity/SLA or memory/large-archive soak.
New report: [backup-baseline.json](tests/DigitalMaktab.Api.LoadHarness/backup-baseline.json);
prior authorization baseline is preserved. All saved driver SHA256 values match
current verifier sources. Package producer/API installed DLL hashes match:
Core 0a07287a9affc45086e06171eb9a37882809cef1c8675d9ffd6d64ec393337ce,
Abstractions b310b07a7ba3947295f330cf73101a436d0af7c52f9a0bb15ef69147e88fc13c,
country 9d74eb20f039eee91e9b717e9c44daec8c3fabe0f42023a492f235967b280bbe.
Local commits: Core e4378ba, country bde0c5b, API a6cf9b5. Precommit gates pass.
No live DB mutation, manual user server restart or push. Install/restart deployed
workers together to load this contract. All seven broader requirements remain open;
remaining editor/reference/output audits, side-effect jobs/file cleanup, shared
classroom authority/routing, production telemetry and deployment/soak/restore
verification are not established by this backup increment.


### Coordinated message retention and attachment recovery (fifty-eighth increment, 2026-10-27)

Discovery traced the message/reaction entities, model/migration constraints, send,
read, pin, edit and unsend callers, upload naming/physical paths, existing database
reaper and both orphan jobs. MessageReaper originally collected every path before
an unbounded DELETE; a winning pin/read/path edit could therefore leave the row
but lose its attachment. Its comment also incorrectly promised reaction cascade:
the actual FK was Restrict and any reacted-to parent deletion failed with 23503.

Extend DatabaseReaper with a bounded scalar-metadata overload. Under the existing
physical-table advisory transaction lock, select at most 250 IDs, acquire surviving
row locks in UUID order, then recheck expiry/projection before DELETE. Values remain
parameterized and identifiers come from EF's mapped metadata/SQL delimiter. Keep
expiry on DELETE and require its affected count to equal metadata count. Only after
commit and transaction disposal do callbacks receive deleted paths. The original
scalar-only path retains its cheaper query shape. No new persistent field/table or
parallel cleanup coordinator. Pin/read/path edits that win before the lock wait
are now respected; cancellation/failed batches roll back without losing earlier
commits. Callback failure after commit leaves recoverable orphan files.

Message retention uses that shared path with its original pinned/read-180d/
unread-365d windows. MessageAttachmentFiles extends the private unlink helper for
reuse by retention and nested orphan recovery, bounding each candidate/reference
query to 250 paths. Preserve any retained message reference across schools and
legacy casing/slashes; only numeric-school message-attachment folders qualify.
Reject absolute, traversal, sibling Resources-prefix, other resource families and
symlinks. Support UploadService's lowercased physical folder vs stored spelling.
The existing nested job now scans message orphans older than seven days in bounded
batches, recovering commit/unlink interruption and normal unsend without a new job,
queue or file ledger. Message/nested shutdown cancellation is no longer logged as
a failed run. All other flat/assignment/material eager sets and writer/reference
races remain a separate audit; these changes do not prove generic filesystem
ownership, hostile symlink-swap protection, bounded directory scan time or optimized
normalized reference query plans. Multiple local-storage hosts still scan their
own files; shared-storage unlink attempts are idempotent, not exactly once.

MessageReactionCascade changes only the existing reaction FK to Cascade; the model
restores that explicit exception after its blanket Restrict convention and the
snapshot matches it. Up/Down replace the FK, preserve rows and alter only future
parent deletion. This also fixes normal authorized sender unsend with reactions.
No copied message/reaction table, new field or unrelated cascade change. The real
migration must run at startup before readiness; verification uses private databases.

Validation: 351 Core tests pass, zero skipped (/tmp/dm-message-full-core.log),
including seven new message cases. Actual hosted job windows, 250/250/120 scalar
batches, reaction cleanup and post-commit visibility pass. Independent PostgreSQL
sessions observe real row-lock waits while pin/read/path updates win; metadata
contains only the current paths of deleted rows. A competing worker returns busy
without publishing uncommitted metadata; second-batch failure preserves the first
250 commits and another worker drains the remaining 370. Cancellation releases its
locks; a failed post-commit callback leaves rows deleted and a recoverable file.

A dedicated private message_migration_tests database now belongs to the existing
Core test script. Starting from the current model/prior FK-history checkpoint,
EF's actual MigrateAsync/IMigrator executor applies, downgrades and reapplies this
migration; row preservation, old Restrict behavior and targeted sender/reaction
removal are verified. This is the new FK migration's executor proof, not full
legacy/fresh Core migration-chain verification. File tests preserve pinned and
foreign-school refs, Unicode filenames, both slash conventions, current uploads,
other resource families and symlink targets. Both candidate/stored case folding
now happen in PostgreSQL; a bounded parameterized unnest/EXISTS returns at most
250 supplied paths, avoiding client/database Unicode-lowercase disagreements or
an unbounded result of legacy case variants. Orphan recovery removes 600 files in
three reference queries while keeping retained/fresh files.

Country integration: 106 passed, zero skipped (/tmp/dm-message-country.log).
Standard clean/build/pack/install and API build pass (/tmp/dm-message-sync.log).
Final producer/API installed DLL SHA256 match:
Core d1218a1fd3fa2b5b2cdbc0331fd93870dc7b49409966116db3973eb87889d3b2,
Abstractions cb874f878efed4cdbc9df6cee140e577f0f314c33a3e721d034bd583132410cf,
country 0a42411a110c6601d2e380871a0bd4d3a7542197e0e64531c3987de80185ee6b.
Local commits: Core 970a852, API documentation 8bdf5aa; precommit, shell syntax and
diff checks pass. No live DB mutation, manual user server restart or push. Update
all workers and allow the new startup migration before readiness. The actual-API
workload reports from earlier increments identify their own prior package hashes;
they are not a fresh HTTP/soak benchmark of this cleanup change.

All seven broader completion requirements remain open. Shared classroom authority/
routing, remaining writer/editor/reference/output audits, generic upload ownership
and eager orphan scans, other side-effect job lifecycles, measured message access
paths, production telemetry and deployment/long-soak/restore verification remain.


### Measured message cleanup access paths (fifty-ninth increment, 2026-10-27)

Discovery traced current Message/MessageReaction model/snapshot indexes, global
expiry and normalized reference queries, both existing validated concurrent-index
migrations and their actual helper/EF-executor tests. PK/SchoolId and reaction FK
indexes already exist; they do not cover the new global date/normalized-path reads.
A guarded 60,001-message/two-school private fixture captured the actual reader and
reaper plans before proposing indexes: sparse/empty expiry reads scan all rows,
and 250-path reference reads build/spill a whole-table hash (about 15 ms locally).

MessageReadIndexes adds three measured paths only: unpinned ReadAt/Id where read,
unpinned SentAt/Id where unread, and the existing lower/replace attachment expression
where non-null. Property indexes are model/snapshot-owned, expression migration-owned;
no copied expiry/path column or new table. The message job reuses DatabaseReaper
separately for read/unread, sorted date/ID, preserving original pinned/null/180d/365d
and post-wait metadata checks. The file reader keeps database-side Unicode folding
and adds the explicit partial-index non-null condition. School/PK/reaction paths
are preserved. Existing btree DDL/validation is extracted into ConcurrentReadIndex
and reused by RetentionReadIndexes and MessageReadIndexes; no parallel guard copy.

Captured plans in Core docs/MESSAGE-CLEANUP-PLANS.txt cover baseline sparse/empty,
indexed read/unread sparse/empty/backlog, actual reaper ID queries stopped before
DELETE, and actual reference batches before/after ANALYZE. Indexed reference probes
are about 0.25–0.47 ms without scan/hash spill on this local fixture. Date selectors
avoid sort/scan and retain the 250 bound. No production user count, HTTP, write-load,
long-soak or fleet capacity is inferred. Source test checks split/original predicate
equivalence, valid partial replay/OID preservation, each incompatible index name,
genuine failed concurrent unique build, suppression flags, actual EF migration
Up/Down/reapplication and preservation of all messages and old SchoolId index.
The private Core harness now provides message_query_tests with strict connection
ownership guards. The actual API load fixture bootstrap also applies this new
migration-owned expression index before marking its model checkpoint history.

Focused message/retention plan and lifecycle tests pass: 9, zero skipped
(/tmp/dm-message-query-focused.log). Full Core suite: 352, zero skipped
(/tmp/dm-message-index-full-core.log). Country integration: 106, zero skipped
(/tmp/dm-message-index-country.log). Standard clean/build/pack/install and API build
pass (/tmp/dm-message-index-sync.log). The updated actual API bootstrap passes its
short two-process smoke (/tmp/dm-message-index-api-smoke.log, --seconds 1): 416 mixed
attempts/414 successes/two expected structured 503s; eight ZIPs succeed, profile
races remain four 204/four 409, all four school invariant sets and process-loss
payment recovery pass. The observed mixed interval is 1.545s including in-flight
work. This is a schema/integration smoke, not a new sustained throughput benchmark;
the earlier full workload reports retain their own package/source hashes. Current
smoke driver hashes match the exact verifier source files.

Final producer/API installed DLL SHA256 match:
Core c36946ab5ae5d1e2c3df01e8ca1673a8203e1d13f8e02ad7293bef779462984d,
Abstractions 9cfcd7f42fc3a3bae732d35c45f812045b36b02b4a027a9276e6ea4fd4dde2cf,
country 86d23557503bae23c30775e52b4948a6a7bdf56962088e06e1915b1c802c9859.
Local commits: Core 3eaa2df, API documentation 9a7f5f6; precommit, shell syntax and
diff checks pass. No live DB mutation, manual user server restart or push. The
new migration needs all workers updated and startup completion before readiness.
DatabaseStartup:LockWaitSeconds is only the initializer-lock wait; migration
commands still use the existing provider command timeout. Separate finite startup
command budgeting/large-index deployment planning remains an operational audit,
not something these private fast-build tests establish.

All seven broader completion requirements remain open: shared classroom authority/
routing, remaining writer/editor/reference/output audits, generic upload ownership
and eager file sweeps, other side-effect lifecycles, production telemetry and full
deployment/long-soak/restore/timeout verification still require completion.


### Independent startup command budgets (sixtieth increment, 2026-10-27)

Discovery traced the existing coordinator, all Core/API callers and real startup
migrate/heal/seed sequence, provider settings, command interceptors and EF typed
query diagnostics. The existing lock timeout governs only waiting, while long
index builds previously shared ordinary provider command deadlines. Extend the
same coordinator/session and existing DatabaseStartup section; no duplicate lock,
service, configuration store, database field/table or reader implementation.

Preserve the original four-argument/default-token overload; the explicit five-arg
budget overload validates 1–1800 whole seconds before connect. API defaults its
CommandTimeoutSeconds to 300 independently of LockWaitSeconds=120. Only the
non-pooled startup connection/EF override changes; ordinary options stay intact,
the prior nullable EF timeout is restored, and the finished context remains fenced.
Infinite/excessive command overrides are capped; shorter ones are honored. Startup
cancellation acknowledgement is finite (zero -> 2s, positive max 5s; -1 skips wait).
Server/network limits and provider cancellation/close overhead still apply.

Testing found streamed query errors can bypass command-failure interception. The
coordinator now temporarily observes existing typed QueryIterationFailed and
QueryCanceled events in the initializer's AsyncLocal flow; context-type-only events
cannot fence unrelated ordinary contexts. Dispose subscription/restore flow at exit.
A swallowed command or streamed timeout/cancellation still prevents completion and
later EF work on that session; fresh initialization can recover. No formatted-log
parsing, result/authority cache, provider reader wrapper or transparent retry. All
startup EF work must use/await the supplied context. Arbitrary native/unsafe/
independent/fire-and-forget callbacks and total CPU/file/initializer wall time remain
outside this per-command ceiling; canceled concurrent indexes still need reviewed
repair, not destructive automatic replacement.

Validation: full Core 357 passed, zero skipped (/tmp/dm-startup-budget-full-core.log),
including five new startup cases. Real provider/server cancellation, sync/async
execute, scalar and streamed reads after rows arrive, shorter/longer/infinite EF
overrides, wait/command independence, restored/null settings, old default-token
source compatibility, ordinary same-provider/type/coordinator flow isolation,
observer disposal and fresh-owner recovery pass. Full source includes streamed
local cancellation after rows arrive as well as streamed provider timeout. The
initial reader test diagnosed EF's transient exception wrapper; the subsequent
streaming test demonstrated the actual missed-interceptor failure and now proves
it is fenced. The pre-existing six startup tests still pass alongside five new ones.

Standard clean/build/pack/install and API build pass (/tmp/dm-startup-budget-sync.log).
Country integration: 106 passed, zero skipped (/tmp/dm-startup-budget-country.log).
Actual two-process API smoke with the new Program overload passes
(/tmp/dm-startup-budget-api-smoke.log, --seconds 1): 468 mixed attempts/466 successes,
two expected structured 503s, eight successful ZIP exports and four 204/four 409
profile edits. All four school invariant sets and process-loss payment recovery
pass. The observed 1.274s interval includes in-flight work; this is an integration
smoke, not a sustained performance benchmark. Current driver hashes match source.

Final producer/API installed DLL SHA256 match:
Core b4bbad9ab4aa5762087926dee079bdad12d12e863a68864ffe9e35102560fe4a,
Abstractions 8e410d0b9b7cdcc186e1c1ff39b6ff6da1714d4670b5b06f2396684bc3840ef4,
country fd338fd7347625d7dbe3464f1d012c3fb92b62a05d3b0cee2b6bbd20b191a6cd.
Local commits: Core cc79d4a, API 49dc936; precommit/diff checks pass. No schema/client
contract change, new package dependency, live DB mutation, manual user-server
restart or push. Packages are installed; update running workers to load the new
Core and host call together. No appsettings rewrite is required: the existing
configuration providers/DatabaseStartup section expose the setting.

All seven broader requirements remain open. Shared classroom authority/routing is
the next major implementation area: re-inspect existing models, root gates/state,
connection bindings, publication and recovery before changing it. Backplane routing
alone must not be enabled over the still-local authority. Remaining writer/editor/
reference/output audits, generic file sweeps, other side-effect jobs, production
telemetry and full deployment/long-soak/restore/overall-startup verification remain.


### Classroom disconnect ownership (sixty-first increment, 2026-10-27)

Discovery traced ClassHub's 14 maps, root-family gates/generations, connection
registry and actual join/move/leave/teardown callers, guarded publication/audience,
cleanup worker, notification-only Redis wiring and account/course models. No domain
classroom/session table exists; the existing Room/RoomAssignment entities are hostel
concepts and are not candidates for reuse. Shared authority needs connection bindings,
epoch/capacity/expiry and publication/recovery coordination, not just dictionary
serialization or SignalR routing. This increment corrects a concrete prerequisite:
disconnect previously held one family's lease but scanned/mutated all room maps.

Extend the existing Core registry, lease, filter and LeaveClass; no new persistent
field/table/service/configuration or country implementation. Remove atomically
retires the transport under the same binding monitor as Room and returns its last
snapshot. It releases capacity before waiting for the snapshot's matching-epoch
cleanup lease. A queued join cannot rebind a retired transport or run its hub body.
DisconnectFromRoom checks state identity, current session identity, same root and
live lease before reusing LeaveClass. The lifecycle callback no longer scans other
rooms. Old generations cannot mutate a replacement, even if an alias remains.
Actual active removals emit UserLeft; pending removals retain host-only queue events.
No phantom active event is emitted for an absent member.

Touch only the matching epoch before Enter and after cleanup: the last disconnected
socket must not make a six-minute-idle but still-live room lose its retained notes
before cleanup. Absolute session-age retirement remains unchanged. Context bindings
clear in finally and leases dispose on failure. Existing waiting cleanup uses
application-shutdown cancellation, not a new total-time deadline. Reconnect cannot
feed a blocked family's roster: binding requires its mutation gate, normal calls
retain invocation admission, and an unbound disconnect skips room acquisition. No
new cleanup queue or unchecked out-of-gate metadata mutation was introduced.

Validation: full private-PostgreSQL Core suite 363 passed, zero skipped
(/tmp/dm-classroom-cleanup-full-core.log); six new cleanup tests cover real sockets,
independent-root contention, protected replacement aliases, invalid/disposed/cross-
state leases, transport release while cleanup waits, a queued join after retirement,
active/pending events and preserved idle notes/expiry. Earlier focused run: 26 passed
before the final sixth test. Manual filter tests now honor real registry lifecycle.
Standard clean/build/pack/install and API build pass
(/tmp/dm-classroom-cleanup-sync.log); Afghanistan integration 106 passed, zero skipped
(/tmp/dm-classroom-cleanup-country.log). No new mixed-load benchmark was needed or
claimed for this lifecycle change; the real-socket tests exercise the affected flow.

Producer/API installed DLL SHA256 match:
Core 123c9eff70678f0f4fa0fb50e1fe6ee6654e3998f3983f899859cdc37e261bf4,
Abstractions ed4e1aaf165796659f272136137d7eb1c32a7ec4dca255082fab0d948ef21dc4,
country 1e39f82cd2311bf7f7c7da31e6300c8fc5142f80a3d356f673c38a0026325cdc.
Local commits: Core 80845e2, API documentation c70ed4b; normal precommit checks pass.
No live DB mutation, user-server restart, new package dependency, schema/client
contract change or push. Packages are installed; running workers must load them.

All seven broader requirements remain open. This is local mutation ownership only:
shared classroom authority/storage, remote connection metadata and abort recovery,
efficient changed-content persistence, commit/publication fencing and multi-host
failure tests remain the next major implementation area. Do not enable ClassHub
Redis routing before that protocol works. Remaining writer/editor/reference/output
and side-effect-job audits plus production telemetry/deployment/soak/restore evidence
remain separate required work; this prerequisite does not complete the broader goal.


### Shared classroom component store foundation (sixty-second increment, 2026-10-27)

The previous turn made verified progress (committed disconnect ownership and passing
Core/country tests). This turn rechecked current state, Core/SDK/model/migration and
actual hub/registry/gate/publication/cleanup call sites plus Redis registrations.
Domain Room/RoomAssignment are hostel concepts and MutationReceipt is durable
business replay; neither represents ephemeral classroom state. Shared behavior
belongs in Core. Reuse the existing NotificationBackplaneConnection multiplexer
and component vocabulary from the fourteen maps, without a country implementation,
new database table/field, additional package or public configuration toggle.

Core now has internal ClassroomFamilyStore: one root-family hash, seven authority/
accounting metadata fields and bounded per-map/per-child component fields. Selected
reads avoid whole-family chat/whiteboard copies; patches preserve unrequested fields.
Client input is snapshotted before validation/argument construction. Component names
and deployment namespaces are validated, keys hash room identities and share one
**deployment-wide** Cluster slot so future cross-root/connection/quota operations
can be atomic. Per-root hash tags would prevent that integration. This concentrates
storage on one shard and requires capacity measurement, not a horizontal storage
scaling claim. Existing school metadata rejects cross-school acquisition. Root
alias normalization still needs integration; no wire identity was silently changed.

Acquisition/renewal/patch/end/release run atomic scripts using Redis server time.
Random epoch and owner tokens plus revision checks reject expired/paused/replaced
owners. Missing expected epochs are never recreated; ending/restarting yields new
random epochs. Successful patches advance revision once; an old handle cannot
repeat a commit. Release never clears a successor. Renewal cannot extend absolute
family lifetime. Client and server bound bytes; server checks final aggregate after
replacements/deletions before writes. Empty bytes and absent values stay distinct.
No automatic mutation retry: cancellation after dispatch is an uncertain outcome.
Lua scripts validate before mutation; runtime failures do not imply rollback of
previous Redis commands. One authoritative primary, protected namespace and correct
command permissions are assumptions, not asynchronous-replica/HA consistency proof.
Official Redis scripting and distributed-lease constraints are linked in Core audit.

This is intentionally an **internal unregistered integration foundation**, not a
finished feature or alternate writable authority. Current ClassHub remains local;
NotificationHub alone retains Redis routing. Do not expose/enable this store until
the existing-type codec, shared connection bindings/local abort ownership, host-loss
recovery, school/global quotas and idle lifecycle, sorted cross-root transitions,
commit-before-publication with frozen recipients/epoch fences, readiness/configuration
and actual multi-host socket/process-loss tests are integrated. The store provides
no shared live membership/quota/idle sweep or event ordering by itself. Absolute
TTL limits retained primitive keys; it is not the current active-member idle policy.
Core docs/CLASSROOM-STATE-AUDIT.md records the full activation gates. No live DB or
user-owned Redis/server was touched, and no application behavior was switched.

Validation: full isolated Core 370 passed/zero skipped
(/tmp/dm-family-store-full-core.log), including seven real private-Redis cases.
After caller-input snapshot hardening and deployment-wide key-slot correction,
all seven affected cases pass again
(/tmp/dm-family-store-final-focused.log). Tests use independent existing multiplexers
and cover 32-way acquisition, tenant/deployment/handle isolation, expired-owner
commit/renew/end/release rejection, sparse reads/deletes/empty values, optimistic
revision replay rejection, aggregate limit/replacement reclamation with no partial
mutation, invalid fields/metadata/wrong types, pre-dispatch cancellation, absolute
expiry despite renewal, real Redis process loss and fresh-epoch recovery. This is
primitive evidence, not shared ClassHub or throughput/HA-failover evidence.
Core local commit: 6371d8f. Packaging/consumer validation recorded below when done.
All seven broader completion requirements remain open; next work must consume this
foundation through the existing state types and coordinated lifecycle, rather than
treating a green primitive suite as completed multi-host classroom support.

Final clean/build/pack/install plus API build pass
(/tmp/dm-family-store-final-sync.log). Afghanistan integration: 106 passed, zero
skipped (/tmp/dm-family-store-final-country.log). Initial pre-key-layout packaging/
consumer checks also passed, but only the final artifacts below are current. The
latest focused test uses the Redis client's actual hash-slot calculation for two
different root keys; it is not a real Redis Cluster failover test.
Final producer/API installed DLL SHA256 match:
Core fc8d4d04b04cbcfaf08dadf16c3b25a7ae362f613fec2a4d0f134bad9c4e5baf,
Abstractions 143c5b3926b49e640e417cff2eb06c3bb520a4084c1e88505d15b03e1aeaa7a4,
country 858a1b34d9ebf2877df4e4f647cb34278a722863dca5badd6cc05431873962e6.
Core commit 6371d8f and normal precommit checks pass. API/country source trees remain
unchanged; packages were installed without a manual user-server restart or live
DB mutation. No push. Next implementation work must connect existing-type state
components to this store, then shared membership/quotas and publication/recovery;
the broader goal remains active and none of its seven requirements is closed.


### Existing-type classroom component adapter (sixty-third increment, 2026-10-27)

The previous turn made verified progress on the internal shared-store foundation.
Discovery in this turn traced each of the fourteen state maps, JSON/wire snapshots,
readonly collections and ignored fields, feature locks, byte/reaction accounting,
root/child reservation lifecycle and actual mutation/bootstrap callers. Existing
ClassHub/ClassroomState fields already represent all needed data; reuse them instead
of adding persisted fields/tables, country data, parallel DTOs or a second domain.
The existing BackupWriteStream already counts before writes and leaves its stream
open: extract it to Core Runtime BudgetedWriteStream and reuse both backup callers
and the component adapter, preserving backup behavior rather than copying a stream.

ClassroomComponents is an internal selected-map adapter under the current family
lease. Its descriptors are the one field vocabulary/count also used by the store.
Private .NET JSON contracts populate fresh readonly collections, omit lock objects
and preserve the existing ParticipantInfo.AccountKey only in storage. Participant
wire JsonIgnore remains intact; existing QA/reaction/vote wire projections do not
change. Anonymous chat entries restore as JsonElement values handled by the same
history serializer. Existing IDs, reaction contributors/charges, stroke owners and
payloads, upvoters, poll votes and byte metadata remain in their original fields.
Reuse Core's exact history-byte/reaction-charge helpers and constants; no copied
formula or independent cap. Readonly-member/contract behavior was checked against
primary .NET documentation linked in the Core audit.

Capture serializes only requested components, with existing feature locks, caller
cancellation and a finite aggregate output budget. Restore first checks all incoming
bytes, decodes/validates every component and child reservation, then changes maps.
ConfigureChildren extends the original ReserveChildren accounting with a replacement
path: capacity checks precede mutation, removed child graphs clear, retained children
survive and room counters update together. A malformed payload, missing participant
storage key, pre-apply cancellation, unreserved child or quota rejection cannot leave
some earlier fields replaced. Partial patches preserve unrequested root fields;
clearing breakouts releases child slots/graphs. No user/database schema or client
wire contract changed. Stream/serialized bounds are not exact heap-allocation SLAs.
Dictionary object key order is semantically irrelevant and not canonical; callers
must not derive dirty fields from incidental order alone.

Validation: focused 26 passed, zero skipped (/tmp/dm-components-focused.log), covering
component/store/lifecycle and actual BackupExportTests. Full isolated Core 375 passed,
zero skipped (/tmp/dm-components-full-core.log), including five new adapter tests.
They populate all fourteen maps through actual hub mutation bodies; transfer them
between independent state instances/private Redis clients; preserve storage keys
while checking participant browser JSON privacy; mutate restored chat/reactions/
upvotes/polls; reject corrupt accounting/missing keys/quota overflow before changing
other fields; preserve unrequested data while deleting closed-child graphs; and
verify byte budgets, cancellation and invalid/disposed/cross-state leases. These
fixtures use mutation bodies, not a substitute claim of shared socket authority.
The initial fixture correctly hit the hub's no-attendee/no-breakout rule; it now
creates a real attendee before starting breakouts. Initial byte-equality assertions
also exposed dictionary order differences; semantic JSON equality verifies content.

The adapter and store remain **internal and unregistered**. Live classrooms are still
local; no dual-write authority or Redis routing switch is introduced. Shared epoch/
metadata binding for isolated execution frames, shared connection/abort ownership,
school/global capacity and idle lifecycle, actual read/write sets, atomic cross-root
moves, commit-before-publication with frozen recipients/epoch fences and recovery/
readiness/multi-host socket/process-loss verification remain mandatory next work.
All seven broader requirements stay open. Packaging/consumer checks recorded below.

Packaging/consumer verification: standard clean/build/pack/install and API build pass
(/tmp/dm-components-sync.log). Afghanistan integration: 106 passed, zero skipped
(/tmp/dm-components-country.log). Final producer/API installed DLL SHA256 match:
Core e5e23571199707bd3ab97f40bd9ebea33ba48512567d7759f028d366573bf14c,
Abstractions 523094507bec9850dda1f6cbb52825f8f93fed6604cd716b43a5e0e95f6fe1b2,
country e238fd679c75cef1f1103f9a729e06b56b365e8b0009619fa9905ce08f23f384.
Core local commit fe0211d; normal precommit/diff checks pass. API and country source
remain clean; no live DB mutation, manual user-server restart, added dependency,
public API/DTO/schema change or push. Packages are installed. No mixed-load benchmark
was repeated or claimed for this internal state adapter/shared stream extraction.
Further discovery confirms SessionLease.Created only exposes Session.Created, whose
actual lifecycle caller is the local age check; shared execution frames still need
explicit authoritative epoch/time binding rather than blindly acquiring a new local
session and treating it as the shared one. Complete that binding next, then shared
connections/quotas and publication/recovery. The broader goal remains active.
