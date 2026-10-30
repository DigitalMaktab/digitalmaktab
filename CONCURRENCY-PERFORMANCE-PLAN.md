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


### Shared session execution frames (sixty-fourth increment, 2026-10-27)

The previous turn made verified progress on the existing-type adapter. Discovery
rechecked store/current registrations, State.Session and all metadata/age callers,
constructor consumers, codec, root/breakout lifecycle, mutation bodies and monotonic
TimeProvider behavior. Session.School/Epoch/Created already represent identity and
creation; bind those in a fresh graph rather than adding another room/domain/DTO.
Redis already had absolute expiry, but cannot recover original creation when host
lifetime configuration changes. Extend the private authority metadata with that
existing concept, not a database field/table or independent policy source. Reuse
Core's constructor, reservation accounting, component adapter and store fences.

ClassroomFamilyStore.OpenFrame now transfers one acquired handle into an isolated
ClassroomState, adopting the exact root/school/epoch/original creation and absolute
expiry. BindSharedSession refuses an existing graph or invalid/expired metadata;
local sessions keep their prior creation-plus-configured-age behavior. Shared
frames use the observed absolute deadline instead of restarting local age. Private
key protocol v2 returns original creation, expiry, server observation and lease
expiry; field accounting reflects its eight metadata fields. v1 was never active,
so there is no live migration or automatic reinterpretation of v1 data. Preserve
the earlier internal five-argument constructor; an explicit clock overload supports
normal shared TimeProvider and deterministic tests. All workers need compatible
protocol before activation. No domain/client schema, package dependency or country
implementation was added.

Record a process-local monotonic start before acquisition. Project Redis observation
time forward by elapsed monotonic time, conservatively including the whole round
trip. Host wall clock skew and later longer configuration cannot extend a frame's
observed lifetime. Never exchange monotonic origins between hosts. Redis still
checks current owner/epoch/revision/server expiry on mutation; a local deadline is
not authoritative under clock jumps/HA failover. Explicit renewal does not mutate
an old frame's observed budget or imply automatic replay.

One acquired handle can open only one frame. Commit is one-attempt, bounds its
selected capture and rejects writes to unloaded components (avoiding deletion of
unseen shared content from scratch maps). Normal commits use the existing atomic
component patch; explicit root end uses the existing fenced delete. Discard/disposal
clears the private graph and releases its local lease plus the matching Redis token;
old disposal cannot clear a successor/replacement. Failed store release relies on
its finite server lease, without retry/spinning/fallback. A failed OpenFrame discards
its local graph but leaves the acquired shared handle with its caller for release.
Uncommitted body changes disappear. No accepted-state publication may follow false
or uncertain commit; staged transport is still future integration, not hidden here.

Validation: initial focused 26 passed, zero skipped (/tmp/dm-frame-focused.log).
Full isolated Core 382 passed/zero skipped (/tmp/dm-frame-full-core.log). A final
single-frame-per-handle guard was then added; all seven affected frame tests pass
again (/tmp/dm-frame-final-focused.log). Cases cover independent clients, exact
generation/creation/expiry through longer host policy, discarded local state,
loaded-field and cancellation guards, old disposal against new ownership, terminal
end/recreation, malformed load recovery, existing-graph refusal and skewed UTC/
advanced monotonic time with a longer local age policy. An initial full run rejected
an already-expired 150ms cold-start fixture; the corrected test explicitly expires
only its owned Redis key before a successor acquires, exercising the final server
fence while the old local budget may still be live. No production deadline was
weakened. Existing primitive natural-expiry tests retain their separate coverage.

Core local commit: 5bddc03. Packaging/consumer proof recorded below when complete.
All seven broader requirements remain open. Store/adapter/frames are still internal
and unregistered: current live ClassHub remains local. Next integrate shared
connection bindings/local abort ownership and host recovery, school/global quotas
and idle lifecycle, read/write sets and atomic cross-root transitions, current-frame
audience resolution and staged recipient/event publication after accepted commit,
readiness and real multi-host socket/process-loss tests. Frame-local counters are
scratch-graph accounting, not fleet retained-room metrics. The rest of the goal's
writer/editor/reference/output/job/telemetry/deployment audits also remain required.

Final standard clean/build/pack/install and API build pass (/tmp/dm-frame-sync.log).
Afghanistan integration: 106 passed, zero skipped (/tmp/dm-frame-country.log).
Final producer/API installed DLL SHA256 match:
Core e6f6c415cfb6753cc23b060ccc98c6275ed766995c271a62916c9e8780010153,
Abstractions fa6089d9aa37afca8507941a1563c6bade015a377294bf6aae76b601ea330c24,
country 85e039ebca159da937aa2fc5d16522f452fd115c314cbea3de717393c20f09bd.
Core commit 5bddc03; normal precommit/diff checks pass. API/country source trees stay
clean. No live database/user Redis mutation, user-server restart, push, new package
or public DTO/schema/configuration change. No mixed-load/HA benchmark was claimed.

Next discovery/implementation must focus on the existing ClassroomConnection record
(account/stamps/impersonator/room/epoch plus local Action Abort) and actual Add/Room/
Remove, audience/delivery, admission and cleanup callers. Share authenticated binding
metadata while retaining abort callbacks only on the owning host; no fake remote
no-op abort or independent duplicate identity. Coordinate connection retirement and
binding with shared family commits, heartbeats/host-loss recovery and global/school
capacity. Keep per-publication DB authority fresh and evaluate recipients through
the current frame/shared binding, rather than the local singleton. Shared cleanup
must not run the current singleton epoch lookup against shared transports. Recheck
those call paths before adding fields/services; existing local registry and gate
semantics must be extended compatibly. All broader completion requirements remain
open; this is the next integration boundary, not an activation/finish claim.


### Shared connection ownership and bounded admission (sixty-fifth increment, 2026-10-28)

The previous turn made verified progress on shared execution frames. Discovery traced
the existing ClassroomConnection record, every producer/consumer, Add/Room/Remove,
abort/retirement, filter lifecycle and slots, audience/current DB authority, delivery
and cleanup, NotificationAccount and registrations. Account/stamp/impersonator/room/
epoch already exist: preserve one metadata shape and move only the Action callback
into a private local entry. Neither account stamp nor room epoch identifies physical
host ownership, so extend this existing Core record with HostId. No new database
field/table, domain identity DTO, country code, second service or dependency.

Local registry captures owner/slot/snapshot under the same binding monitor. Owner
changes require an empty registry. Find/Remove preserve existing consumers; aborts
remain local. AbortIfCurrent/IsCurrent use the exact pre-await local snapshot object,
not value equality, fencing A -> B -> A moves without another stored revision field.
Deserialized remote metadata has no abort callback or local abort capability. Existing
local socket lifecycle/admission/audience behavior remains the regression target.

Extend the same private ClassroomFamilyStore for shared host leases and transport
admission, reusing its connection, clock and one namespace/Cluster-tag helper. A
single record snapshot plus operational nonce/status/deadline represents each
transport. Host/pending/ownership sorted indexes and school counts are derived
access paths, not independent identity models. Fresh host IDs are random ownership
generations; dead/missing ownership cannot renew or activate a transport. New owner
recovery must retire old local connections before changing local ownership.

Reserve -> complete prevents disconnect-before-registration resurrection. Pending
slots consume bounded global/school capacity but cannot receive events. Completion
requires the pending nonce/deadline and live host. RegisterConnection checks the real
local snapshot before/after completion, checks cancellation and retires failed or
uncertain admission by reservation nonce. A late reserve after local retirement is
canceled/expired without becoming a recipient; a late completion cannot recreate a
retired row. No automatic command retry or fake remote callback/local fallback.

Private ConnectionPolicy validates global 1–4096, school within global, hosts 1–256,
host lease 100–120000ms and pending 50–10000ms below host lease. These are internal
protocol/test parameters, not new operator configuration or advertised supported-user
counts. Matching fingerprints prevent incompatible active admission policies. A
fully drained namespace can change limits; expiry maintenance uses stored deadlines
independently so expired old ownership can drain under a restarted configuration.
Fresh reads take at most 100 distinct connection IDs and reject pending/dead-host
recipients; permission freshness remains ClassroomAudience's existing real SQL.

Sweep plans/validates metadata and affected counts before its first delete, processing
up to 64 expired hosts and 100 expired pending rows, at most 4096 total connections. It
updates records/indexes/counts together and returns last snapshots plus host progress
(including empty hosts). Subsequent batches remain the caller/worker's responsibility;
capacity can stay busy until cleanup runs. Host lexicographic index members all use
score 0; official Redis lex-range semantics are linked in the Core audit. Protected
namespace, compatible permissions, one authoritative primary and Lua runtime-error
limitations remain explicit; no heap/wall-time/fleet throughput or HA promise.

Validation: focused 18 passed/zero skipped (/tmp/dm-connection-focused.log), exercising
new admission plus existing real-socket access/disconnect cases. Full isolated Core
389 passed/zero skipped (/tmp/dm-connection-full-core.log), including seven new cases.
After allowing deadline-only cleanup across a drained policy change and extracting
the common namespace helper, final 14 affected protocol tests passed/zero skipped
(/tmp/dm-connection-final-focused.log). Tests cover independent owners/tenant/deployment
isolation, pending invisibility, retire/register races, exact local callback fencing,
finite host/global/school caps, expired pending/host reclamation and no resurrection,
count corruption without partial cleanup, changed-policy drain, 20 concurrent attempts
accepting exactly 3 for one school, and actual private Redis stop/restart with no local
fallback/new ownership required. Local socket permissions still use the existing full
regression suite. Core local commit cab746c; packaging/consumer checks below when done.

The shared path is still internal/unregistered and live ClassHub remains local.
All seven broader requirements remain open. Next implement atomic family/binding
commits and cross-root moves, shared room quotas/idle lifecycle, current-frame actor/
audience lookup, heartbeat/last-binding reconciliation in the existing worker,
staged recipient/event publication after accepted commit, policy/readiness/config and
actual multi-host socket/process-loss recovery. Do not turn on routing or apply the
current local singleton epoch sweeper to shared transports. Remaining editor/writer/
reference/query/output/file/job and production telemetry/deployment audits also remain.

Final standard clean/build/pack/install and API build pass
(/tmp/dm-connection-sync.log); Afghanistan integration 106 passed, zero skipped
(/tmp/dm-connection-country.log). Producer/API installed DLL SHA256 match:
Core c2da1a322e037366ddfde8c05ea85bea58828b33548c0ddc73ec178a2c777aa5,
Abstractions 1503cc985325691250e3b3a71b2561c26ab9072a580ad459c934dede8207bcfb,
country 481b67224a7471b30cdde834f4dd025bbcbdc4cb1b66625b9b73a0157478866c.
Core commit cab746c; normal precommit/diff checks pass. API/country source trees
remain clean. No live DB/user Redis mutation, manual user-server restart, push,
public DTO/schema/configuration change or added package. No production capacity,
shared-socket or mixed-load benchmark claim. The user's remaining-work question was
answered against the seven open checklist areas; the goal stays active.

Next integration discovery: shared metadata must feed frame membership without a
local fallback (even an empty shared snapshot scope must not fall back to local
Find). Keep IsCurrent/AbortIfCurrent/Remove tied to their actual local entries.
Delivery needs fresh shared connection reads before its existing fresh DB audience
checks, rather than trusting an invocation snapshot forever. Bind room/epoch changes
with family patches in one atomic operation; don't independently call local Room
and then persist a family. Cross-root changes require both leased generations and
all validations before writes. Lifecycle registration must use the high-level
reserve/complete wrapper with the actual local snapshot/cancellation predicate.
Reconcile retired metadata and missing bindings through the existing worker/frame
path, and stage/freeze publications before teardown. Re-inspect actual callers and
reuse existing contracts before implementation. Shared routing remains disabled.


### Atomic family/binding transitions (sixty-sixth increment, 2026-10-28)

The previous turn made verified progress on connection metadata/admission. Discovery
traced family patch/end accounting, frame ownership/read sets, shared metadata and
local Room updates, actual join/leave/end/breakout code, membership/pending DTO shapes
and sorted cross-root gate callers. Existing frames/metadata/components represent
all domain data; an independent one-root patch plus binding update cannot represent
one atomic move. Extend the same authority. Internal FrameEdit/FamilyChange wrap
existing handles/patches for bounded prevalidation; they are operation plans, not
another domain DTO/table or persistent source of truth. No country special case,
new database field/table, binding revision or package dependency.

CommitBinding prepares at most two distinct old/new-root frames, same authority and
school, in ordinal root order. Preserve one-attempt and loaded-field rules and bound
bytes across the whole transition. The shared script checks live host/connection,
all original account/stamp/impersonator/binding metadata and every family's school/
epoch/owner/revision/expiry before writes. Extract FamilyPatch prepare/apply from the
old single-root implementation; ordinary patches and multi-root binding operations
share accounting rather than diverging copied code. All keys retain one Cluster tag.

Validate prospective components, including supplied deletes. A new binding needs
its actor in classes/pending, and a child needs its root reservation. A live old room
needs the matching leased family, with the actor removed before changing/leaving
its binding. Missing/replaced generations permit read-only unbinding without touching
new graphs. Unrelated frames and changed authentication snapshots are rejected.
Encoding and all family budgets finish before writes to either family or binding.
ApplyBindingIfCurrent accepts the committed metadata only while the exact original
local snapshot remains, preserving authenticated identity. It cannot resurrect a
retired connection. A failed local update after accepted remote commit needs normal
retirement/reconciliation, not replay or invented remote rollback.

Validation: focused 22 passed, zero skipped (/tmp/dm-binding-focused.log), covering
eight new transition cases plus existing family/frame protocols. Full isolated Core
397 passed, zero skipped (/tmp/dm-binding-full-core.log). Cases use real mutation
bodies/private Redis for joined roster+binding, both-root moves/auth preservation,
missing old lease/forgotten leave with neither graph changed, retired actors, second-
family budget rejection preserving both graphs, stale unbinding against protected
replacement, missing prospective child reservation, unrelated frames/altered stamp
and local snapshot-only application. The breakout fixture honors actual waiting/
attendee/minimum-two-room rules; no production rule was weakened for a fixture.

Full-suite verification exposed two fixture issues, resolved with evidence:
- Multiple private Redis/Kestrel setups contended for thread-pool startup with 500ms
  fixture connections. Reuse existing RegistrationHostCollection for Redis-owning
  suites; explicit concurrent protocol calls remain. Production timeouts unchanged.
- An existing attendance EXPLAIN fixture put 8,000 days on one enrollment, and selected
  a sequential plan under the full preceding distribution while passing alone. Seed
  the same 8,000 historical rows as 40 enrollments x 200 days using existing entities,
  verify physical index keys/ready/valid state and retain normal planner/query. All 14
  daily attendance tests pass (/tmp/dm-binding-attendance-class.log), followed by the
  full 397. No index/production data/planner configuration changed or speed claim made.
The first full attempts failed 4 fixture Redis startups, then 1 attendance fixture;
the final clean run above passes without skips. No automatic mutation retries added.

Core local commit/package consumer verification recorded below when complete. All
seven broader requirements remain open. Shared store/frames/admission/transitions
are still internal/unregistered: next integrate current-frame shared membership and
audience without local fallback, actual invocation coordinator and dirty-field plans,
shared room quotas/idle lifecycle, heartbeat/last-binding cleanup, staged recipient/
event publication after accepted commit, readiness/config and real multi-host socket/
process-loss tests. The rest of editor/writer/reference/query/output/file/job and
production observability/deployment verification remains required as well.

Final standard clean/build/pack/install and API build pass (/tmp/dm-binding-sync.log).
Afghanistan integration: 106 passed, zero skipped (/tmp/dm-binding-country.log).
Producer/API installed DLL SHA256 match:
Core e82b5385291811b4909ec3da883fc2e39891bac50fa614aa0a068acfcb984c74,
Abstractions c27773bf96463e37dcb248437228afb2c2dc11b7620f3caea2887507d76d70b7,
country 8c23d463afd15782de5e983383f102f3b24adcf5946f89edfdaf96bed24e1071.
Core local commit f83efbf; normal precommit/diff checks pass. API/country source
remain clean. No live database/user Redis mutation, manual user-server restart,
push, public API/config/schema change or dependency added. No production/multi-host
socket capacity or benchmark claim. Goal remains active with all seven completion
requirements open.

Next implement invocation-scoped shared metadata/frame selection for existing
ClassroomState/Delivery without local fallback, preserving local IsCurrent/Remove/
abort capability and fetching fresh shared metadata before existing DB audience
checks. Then integrate the actual filter/coordinator, shared room capacity/idle and
host heartbeat/reconciliation, freeze/stage events and recipients before teardown,
commit before delivery, readiness/config and actual multi-host recovery tests. Do
not activate routing based on atomic-store tests alone. Re-read actual callers and
reuse existing state/contracts rather than adding parallel lookup/delivery services.

### Invocation-scoped classroom membership/delivery (sixty-seventh increment, 2026-10-28)

Discovery traced actual registry ownership/lookup callers, state membership/group
enumeration, frame ownership, proxy creation and fresh DB audience checks. Extend
those existing Core implementations with internal invocation context; no new domain
DTO, database field/table, provider, public option, country data or DI registration.
SharedSelection selects at most two distinct frames and bounded existing metadata,
validating authority/school/registry. Synchronous AsyncLocal entry flows into callers;
empty selections hide local lookups, and disposed child-flow scopes stay closed.
Local ownership/removal/abort remain tied to actual local snapshot references.

Selection settlement reuses CommitBinding, permits one attempt and enables sends
only on acceptance. Selected actor metadata adopts the committed binding. Group
resolution uses the proper selected frame and existing membership logic. Delivery
proxies capture selection at creation, suppress uncommitted/disposed use and local
proxy reuse inside shared execution. Fresh shared metadata precedes and follows
existing fresh DB authorization, requiring the exact original identity/host/binding.
Retirement or movement during DB checks cannot authorize old content using the new
binding. Lookup failure has no local/unchecked fallback. This does not make DB,
Redis and network one transaction or solve post-check transport races.

Five focused tests pass (/tmp/dm-selection-focused.log): nested/empty/disposed-child
lookup isolation, local abort ownership, successful/failed one-attempt settlement,
foreign school/registry rejection, remote group delivery without local callback,
retirement during actual PostgreSQL audience resolution, credential revocation,
precommit suppression and captured proxy disposal. They reuse the existing private
Redis fixture, actual mutation bodies and real DB audience with a recording transport;
they do not establish cross-host SignalR sockets. Shared routing remains disabled.

First full run: 401 passed, one failed, zero skipped (/tmp/dm-selection-full-core.log).
The existing attendance plan fixture selected a sequential scan despite a physical
valid/ready index. The full daily-attendance class passed 14/14 in isolation
(/tmp/dm-selection-daily.log). Index failure diagnostics now include indcheckxmin/xmin;
no production index, planner settings or test assertion was weakened. Full diagnostic
run/package integration results will be recorded below after completion.

All seven broad requirements remain open. Next integrate actual invocation planning/
coordinator, staged recipients/events, shared room quotas/idle lifecycle and host
heartbeat/reconciliation, readiness/configuration and real multi-host process-loss
socket tests. The remaining editor/writer/invariant/query/output/file/job audits and
production monitoring/deployment/load/restore verification remain in the full goal.

Full diagnostic run: 402 passed, zero skipped
(/tmp/dm-selection-full-core-diagnostic.log). Core local commit 8b65a15; normal
precommit gates pass. This later clean run does not diagnose or establish a fix
for the earlier order-sensitive attendance planner result; retain that concern in
the remaining query/fixture audit rather than claiming it is resolved. No assertion,
production planner setting or index was changed. Final package/consumer verification
is recorded below when complete.

Final standard clean/build/pack/install and API build pass (/tmp/dm-selection-sync.log).
Afghanistan integration: 106 passed, zero skipped (/tmp/dm-selection-country.log).
Producer/API installed SHA256 match:
Core c473abe5a9597a6f18c68ffaf48390b08edd4b1ae21e5efff4389360a6f489ae,
Abstractions 7b721a9886984212d9794c0585b953b4c2b9cc98f390e92d1501c58cba7167bb,
country 0d15b7472ea149a84e1b8144911fa52d92032e20e8b5f539c939479a103e48dc.
Core commit 8b65a15; API/country source trees remain clean. No live DB/user Redis
mutation, manual user-server restart, push, public API/schema/configuration change
or added dependency. No production/multi-host socket benchmark or capacity claim.

Next integration discovery must trace all ClassHub methods and state helpers before
choosing frame read/write sets. Hydrated roster values may contain stale transports:
selection-based lookup alone does not trim bootstrap snapshots of room.Values. The
coordinator must reconcile current metadata before authorization/body/bootstrap,
acquire old/new roots in stable order, retain actual DB actor checks, stage/freeze
all events and recipients, settle the accepted family/binding change, then deliver.
Do not auto-retry uncertain commits or mutate the local singleton as a second
shared authority. Shared room admission/idle expiry, host heartbeat/last-binding
cleanup, policy/readiness and actual multi-host socket/process-loss recovery remain
activation gates. Also retain the intermittent attendance plan-fixture concern in
the wider query audit. All seven broad completion requirements remain open.

### Staged shared classroom publications (sixty-eighth increment, 2026-10-28)

Discovery traced all ClassHub sends/group operations and actual mutable/terminal
payload behavior, selected membership, atomic commits, configured SignalR JSON and
Core BudgetedWriteStream. Existing state/selection/delivery own the concepts; extend
ClassroomDelivery with internal invocation-only capture rather than a new store,
outbox table, public DTO/service/configuration or country implementation. Repeated
owned wrapping is idempotent to avoid recursive staging during lifecycle/filter reuse.

StageShared enters synchronously before the shared body. Each send freezes bounded
original recipient metadata and arguments with actual SignalR wire JSON through the
shared byte-counting stream. Mutable ParticipantInfo/rosters cannot alter previous
events. Do not serialize the private component codec or expose AccountKey. Terminal
group audiences survive room/frame cleanup. Shared transport group operations have
no external effects: existing delivery targets explicit connection IDs and shared
membership comes from selected frames/metadata, not another transport group cache.
Local group behavior remains intact.

Bound each invocation by min(16,384, connections * 16 + 64) events, connections * 32
recipient references, existing chat/board/reaction byte budgets + 1 MiB (including
method/recipient allowances), 256-character method names and 16 arguments/event.
Limits/serialization/cancellation failures poison and clear the entire batch before
commit even if caught. These are resource bounds, not a production memory/latency
SLA. Future coordinator errors must reuse existing localized Core content/unavailable
responses.

Batch Commit seals capture before one-attempt CommitBinding; false/uncertain results
cannot flush. Preserve an accepted remote outcome even if concurrent disposal cancels
publication. Flush once in event order via existing admission, deadlines, fresh shared
metadata and fresh DB authority. Only the accepted actor can adopt its own committed
binding for its captured bootstrap; freeze all other recipient metadata exactly.
Selection retains staged ownership so disposed batches cannot re-enable direct sends.
Cancelled/partial transport does not replay the commit or output automatically.

Focused 13 tests passed (/tmp/dm-staging-focused.log), including eight new cases:
mutable/private wire values, join bootstrap, terminal audience after clearing room
and disposing frame, rejected transition, byte/event limits, cancellation during
capture/flush, late DB stamp revocation, no direct bypass and one-attempt settlement.
Use private Redis/real PostgreSQL with the recording transport; this is not actual
multi-host socket recovery evidence. Full suite/package results follow when complete.
All seven broader completion requirements remain open; shared routing stays disabled.

Full isolated Core: 410 passed, zero skipped (/tmp/dm-staging-full-core.log).
Standard clean/build/pack/install and API build pass (/tmp/dm-staging-sync.log).
Afghanistan integration: 106 passed, zero skipped (/tmp/dm-staging-country.log).
Producer/API installed SHA256 match:
Core 0ae5540228a2a753222969859fc0810047fff7cc790fed00006875afefff3af7,
Abstractions 0db087b782b2c66351274e52ba393d8f369eed2ac980aa5ccf77b1f41d23d074,
country 38ff3debefcb55ff328a519163c2f63d1c26533f3ffccf32519ed69cf957ebb4.
Core local commit 35ac501; normal precommit/diff checks pass. API/country source
trees remain clean. No live DB/user Redis mutation, manual user-server restart,
push, public API/schema/configuration change or dependency added. The prior
intermittent attendance planner-choice concern is not diagnosed by this clean run.

Next connect these pieces to the actual invocation coordinator, after tracing each
method's reads/writes and bootstrap/stale-roster behavior. Select/hydrate existing
frames and current metadata before body execution, retain actual fresh DB actor/
peer checks, acquire old/new roots in deterministic order, stage first, settle once,
apply accepted local binding only to its original snapshot, then flush captured
output. Ensure overloaded/content-limit/unknown outcomes use existing localized
Core responses; never auto-retry an accepted or uncertain mutation. Complete shared
room quota/idle lifecycle and host heartbeat/last-binding recovery, generation-fenced
client output, readiness/config and actual multi-host socket/process-loss tests
before activation. Remaining editor/write/invariant/query/output/file/job audits and
production monitoring/deployment/load/restore evidence stay in the full goal. All
seven top-level requirements remain open; do not infer fleet readiness from these
private protocol/recording-transport tests.

### Internal shared classroom invocation coordinator (sixty-ninth increment, 2026-10-28)

Discovery traced all 56 public operation bodies plus lifecycle, actual map reads/
writes/bootstrap/fanout, filter/local binding callers, DB authority, frames and staged
output. Reuse those same Core implementations. ClassroomInvocationPlan is a private
operation read/write set over existing component descriptors; ClassHub.UseState
selects/restores an existing isolated frame. Neither is another retained state store,
domain DTO/table or service. No country schema, public toggle/contract/DI registration
or shared routing activation is introduced.

Every operation has a closed reviewed plan. Ordinary typing/laser/cursor/signaling
load three fields (current active/pending rosters and root reservation), not histories.
Bootstrap/admission loads the current room's components; related breakout fanout/end
adds its actual related roster/cleanup fields. Root end uses existing fenced hash
end; child cleanup declares every field cleared. Merge previous membership reads for
within-family moves; acquire different roots in deterministic order. Unknown methods
fail closed and tests enumerate the actual public operation surface.

InvokeShared uses normal invocation admission/deadline/error handling and extracted
RequireActor/RoomAccess/method/peer checks. The registry's existing identity parser is
now reused for Add and MatchesContext, including nonzero impersonator IDs/stamps.
Verify actual local snapshot and live remote identity/binding after waits and before
body/commit; repeatedly check current DB actor/course/direct-room permissions. Leaving
uses only the caller's authoritative binding and remains possible after revocation.
Bound shared metadata reads to 100 records per batch, tenant-narrow, reuse fresh DB
audience checks and prune loaded stale/wrong-room/wrong-epoch/revoked members through
existing LeaveConnection, preserving active versus pending notification semantics.
Unrequested history remains untouched.

Stage all output before reconciliation/body. Reuse actual CheckJoin so a locked/kicked
target preserves the old room and no uncommitted target cleanup is published. Run the
actual hub body against selected frames, settle both room graphs/binding once, apply
accepted local metadata only to the original snapshot and then flush. A final local
apply race aborts the actual transport, reports unavailable and requires reconciliation;
no accepted remote rollback/retry is invented. Release acquired frames in reverse order.
Context.Items/local binding remain caches rather than shared authority. Capacity limits
now reuse ClassroomCapacityException; normal Busy localization also handles Redis/
invalid stored JSON failures. Ownership/programming violations aren't blanket caught.

Focused final 39 passed, zero skipped (/tmp/dm-coordinator-final-focused.log), including
13 new cases covering closed plans/hot reads, actual joins/edits/leave without singleton
mutation, independent owners, stale bootstrap pruning, rejected and accepted root moves,
pending admission and host escalation rejection, revoked cleanup, local/remote retirement,
localized output/corrupt-state failure, breakout join/fanout/end/return, busy old-family
move rollback and all chat/pins/reactions/QA/poll/board/participant state across calls.
Tests use private Redis/real PostgreSQL and actual hub/filter bodies in independent DI
registries with a recording transport; this is not authenticated multi-host socket or
process-loss evidence. An earlier full 423 passed before reducing hot reads to current
membership only (/tmp/dm-coordinator-full-core.log); final full/package evidence follows.

Shared routing remains disabled. Complete shared room/global/school quotas and idle
lifecycle, host admission/heartbeat/disconnect/last-binding reconciliation in the
existing worker, generation-fenced client output/resync, readiness/configuration and
actual multi-host socket/process-loss recovery before activation. The local singleton
epoch sweeper must not run against shared transports. All seven broader requirements
and remaining editor/write/invariant/query/output/file/job/production audits stay open.

Final full isolated Core: 423 passed, zero skipped
(/tmp/dm-coordinator-final-full-core.log), validating the final three-field hot-read
plans and all ordinary local socket regressions. Core local commit c165118; normal
precommit/diff gates pass. The older attendance plan-fixture intermittent failure
remains undiagnosed despite these clean runs. Final package/consumer checks follow.

Standard clean/build/pack/install and API build pass (/tmp/dm-coordinator-sync.log).
Afghanistan integration: 106 passed, zero skipped (/tmp/dm-coordinator-country.log).
Producer/API installed SHA256 match:
Core 550946779f5402fbd3965aaf08c4424f7eca2b71fc24b6003a0825670bd1c22f,
Abstractions 2844e0542819a525bfba2a67c2ef920e9e338053e02502ba931d0f8c953ffcaf,
country 7aa2d1820932d9f08e36910350ea4141232f990792fd6400634a486750c095c5.
Core commit c165118; API/country source remain clean. No live DB/user Redis mutation,
manual user-server restart, push, public mode/API/schema change or dependency added.
All seven goal requirements remain open; no shared production capacity, deployed
fleet readiness, authenticated multi-host socket or HA claim follows from this work.

Next extend the existing authority/worker for retained room quota and idle lifecycle,
using the existing root/child reservation, school ownership, creation/expiry and
connection metadata concepts rather than another domain table/provider. Admission,
family patch/end and stale-host reclamation must maintain one fenced authoritative
room count; don't mistake isolated frame counters for fleet quotas or let release/
renewal extend absolute lifetime. Trace actual sweeper/registration/disconnect callers
before integration. Keep current local sweeps off shared transports, stage lifecycle
notifications through accepted frame changes, and implement client generation fences,
readiness/config and real multi-host socket/process-loss recovery before activation.
The rest of the broad editor/write/invariant/query/output/file/job/production audit
and earlier attendance fixture concern remain part of the full goal.

### Shared retained-room quota/expiry authority (seventieth increment, 2026-10-28)

Discovery traced existing Created/Expires/Touched, child reservations, local empty/
idle cleanup, every family acquire/patch/end/release, binding moves, host/connection
sweep and cleanup-worker callers. Reuse ClassroomDeliveryOptions and Core ephemeral
state. Persist existing Touched as @touched because fixed creation/expiry, cleared
lease-until and revision cannot represent elapsed activity. Three derived same-slot
indexes maintain fenced root projections, global/school retained counts and bounded
due scheduling; they are not another domain store/table. Root hashes and child
reservations remain content authority. Private v3 has nine metadata fields; v2 never
had registered/live routing, so no live data migration is introduced or performed.
Old private constructors preserve compatibility by forwarding to default settings.

Acquire allocates one root; prospective 0/breakouts determines child slots. Ordinary
patch/end and atomic binding/multi-root moves prevalidate content, metadata, encoding
and net global/school deltas before any write. No intermediate quota failure after
changing a first root. Preserve school/epoch/expiry fences across deletion/recreation.
Incompatible policies require drain; expiry cleanup can reclaim stored old-policy
indexes. Validate key types, due cardinality, negative/impossible counts and observed
root/reservation matches rather than automatically repairing/overwriting unknown state.
Protected namespace, no eviction and coordinated single-primary recovery remain needed.

Server-time @touched drives retention; due scores only schedule probes. Payloadless
creation is due at lease deadline and a valid release queues prompt cleanup; owned
EndIfIdle can remove empty content without history retention. Retained content waits
for idle, and any active/pending roster conservatively blocks deletion until actual
worker reconciliation. Quiet maintenance release does not reset activity/probe timing;
stale release/renewal never extends activity or absolute expiry. DueRooms is bounded
at 64 projections; SweepExpiredRoom validates exact school/epoch/expiry/generation
before releasing orphaned/expired indexes. Other expired slots remain counted until
bounded maintenance; targeted recreation can replace its own expired index atomically.
Finite script compositions are memoized, avoiding rebuilding policy/ledger text for
every gesture. These are resource invariants, not a measured production capacity SLA.

Ten new private Redis cases cover 20 competing admissions across authorities, school/
global caps, child reservations/deletion, quota/index/counter failures without content
changes, history idle/quiet release, pending occupancy, expired index reclamation and
replacement fences, changed-policy drain, rejected two-root quota changes plus net-zero
child transfer, stale release/renewal and prompt blank-room cleanup. Focused protocols
44 passed before the final structural/empty-probe changes; final quota/attendance
fixtures 24 passed, zero skipped (/tmp/dm-room-ledger-final-fixtures.log). Full isolated
Core 433 passed, zero skipped (/tmp/dm-room-ledger-final-full-core.log); subsequent
memoization of unchanged script text passed all 45 affected protocols, zero skipped
(/tmp/dm-room-ledger-final-protocols.log). Package/consumer results follow when done.

Earlier full attempt: 430 passed/2 failed (/tmp/dm-room-ledger-full-core.log): the
attendance plan used a sequential scan with a valid/ready index, indcheckxmin=true,
xmin=3322, and one private Redis startup failed while another private suite overlapped.
PostgreSQL documents the old-snapshot index safety fence in
[pg_index](https://www.postgresql.org/docs/current/catalog-pg-index.html).
Reuse RegistrationHostCollection isolation for the migration/EXPLAIN class, preserve
all in-test races, query/index/data and the real index assertion, and log its snapshot
from the same repeatable-read transaction as EXPLAIN. Run private processes sequentially;
no production planner setting/index/timeout or live database was changed. Initial Lua
composition newline and fixture variable naming errors were fixed before final passes.

All seven top-level requirements remain open. Shared routing is still disabled pending
existing worker integration with room/host maintenance and full membership reconciliation,
generation-fenced client output/resync, readiness/config and actual multi-host socket/
process-loss recovery. Do not sweep shared transports using local singleton epochs.
Other editor/write/invariant/query/output/file/job/production audits remain in the goal.

Core local commit b6eb3f3; normal precommit/diff gates pass. RoomCandidate is an
index projection for expired generations, not a substitute lease: Lease requires
live ownership and cannot truthfully represent a TTL-expired root. No fabricated
owner/abort capability or parallel room DTO is introduced. Standard consumer/package
verification is recorded below after completion.

Standard clean/build/pack/install and API build pass (/tmp/dm-room-ledger-sync.log).
Afghanistan integration: 106 passed, zero skipped (/tmp/dm-room-ledger-country.log).
Producer/API installed SHA256 match:
Core d857be9239756bb983c191148a6f5f65f74c5a51fab47468d28872956544850f,
Abstractions 5546cdd7d28a83ed5034be4dae771efb67b21177755d239ebff4f9fcb13bb745,
country 4f9bf2ae2be89be0c1e0d56279cac60765d2e23a1698d54b8b3bbb184bc05a91.
Core commit b6eb3f3; API/country source remain clean. No live DB/user Redis mutation,
manual user-server restart, push, public API/mode/schema change or dependency added.
This implements authority invariants and bounded maintenance APIs, not a running
shared cleanup/host-recovery worker or supported production concurrency figure.

Next integrate with existing ClassroomCleanupBackgroundService and connection/hub
lifecycle after tracing actual notification/backplane initialization and shutdown.
Own/renew the existing HostLease before admission, reserve/complete real local
transports, atomically retire and reconcile their last bindings, drain stale hosts
and room candidates in bounded batches, and stop local singleton sweeps for shared
mode. Use existing frame/selection/commit/staged delivery for accepted cleanup changes;
never fabricate a live actor for an expired/retired connection. Quiet probes must not
postpone idle; reconcile stale rosters before conservative idle checks. Add epoch-
fenced client resync/delivery, policy/readiness/config and actual multi-host socket/
process-loss/recovery verification before activation. All seven broad requirements
and the remaining editor/write/invariant/query/output/file/job/production audits stay
open. Keep the full goal intact rather than treating these protocol tests as fleet
readiness or whole-application completion.

### Shared host admission and actorless maintenance (seventy-first increment, 2026-10-28)

Discovery traced the existing Core registry/filter/cleanup worker, health tracker,
host/reservation/nonce/by-host authority, room due ledger, DB audience, frames,
selection, staged publication and ClassHub.LeaveConnection. Extend those rather than
introducing another service, transport identity, cleanup queue, DB model, Redis field
or country implementation. HostPage is a bounded projection of actual reservations.

Internal AttachShared requires an empty matching runtime and remains sticky through
outages/shutdown. The existing filter registers actual transports against a live host,
pins the actual nonce before completion, and retires their authoritative last binding.
Context.Items reference fences old callbacks and invocations, including same-ID/account/
stamp replacement; transient HubCallerContext wrapper identity cannot provide that fence.
Release local slots before remote waits. Never manufacture a user context for cleanup.

The existing worker runs independent heartbeat and cleanup loops, with aggregate health.
Conservative monotonic freshness begins before ownership RPCs. Expiry/loss closes actual
owned transports; recovery requires a new host generation, with no local-state fallback.
Audit 100 own-host records per page using pinned local reservations, fresh DB authority,
membership and a final metadata read, reclaim existing indexed orphans, and inspect up
to eight due families. Existing cancellation/operation/school/publication budgets apply.
SignalR transport resolution belongs only in shared maintenance: Core API hosts that
do not register SignalR must still start normally.

Actorless reconciliation reuses ReadRoster/PruneRoster and actual LeaveConnection in
isolated frames, selection, and commit-before-flush output. Its Lua commit can only
remove unchanged members under live host/school/epoch/revision/lease fences. Caller-
only delivery is unavailable without a real actor. Urgent due scores survive same-
epoch commit/release; idle probes inspect actual shared metadata before postponing
stale roster cleanup. Quiet maintenance never updates activity or extends lifetime.

Thirteen lifecycle cases cover actual admission/disconnect publication, queued cleanup
and later release, expired ownership/stale same-ID callbacks, orphan pagination, DB
revocation, removal-only reconciliation, idle history expiry, shutdown/local-sweep
exclusion, a real JWT WebSocket, Redis restart/new generation, and heartbeat while DB
cleanup is blocked. Focused lifecycle/room/invocation: 36 passed, zero skipped
(/tmp/dm-host-lifecycle-focused.log), before the final monotonic return refinement.
The first full run found mandatory transport injection broke three non-SignalR API
hosts (443 passed/3 failed). Resolve transport only inside shared maintenance and
rerun the full suite. An earlier socket fixture double disposal was corrected without
changing production timeouts or behavior. Final full/consumer evidence follows below.

Shared mode is still privately attached only; no public option or Redis ClassHub
routing is enabled. Next: configuration/readiness, client generation/resync fences,
and actual multi-host socket/process-loss/recovery integration before activation.
All seven top-level areas and remaining editor/write/invariant/query/output/file/job/
deployment/soak/restore audits remain open. Single-host sockets/private Redis restart
do not establish fleet recovery, failover consensus or production capacity.

Final full isolated Core suite: 446 passed, zero skipped
(/tmp/dm-host-lifecycle-full-core.log), including the startup compatibility fix and
final monotonic freshness return. Core local commit f7914cb; precommit Release build,
strict locale/enum/hosted-service/isolation checks and diff checks pass. Standard clean/
build/pack/install and API build pass (/tmp/dm-host-lifecycle-sync.log).
Producer/API SHA256 match:
Core 2e918c768782a1276882e1c29e9dfac2781b4fd2b54df0225dc32ea34cc068f5,
Abstractions 1d3cb7e6670820e708307f370d59d09d965779c3f032b4c5d7ecfa48bab5d183,
country 2690d624cdc34ad6dcde379ff495a52512f5db5b975a1535b330ac8988fe7f55.
No live database/user Redis mutation, manual user-server restart, public activation,
dependency addition or push was performed. Country test results follow below.

Afghanistan integration: 106 passed, zero skipped
(/tmp/dm-host-lifecycle-country.log). API and country source trees remain clean;
their installed binaries match the committed producers above. Continue with client
generation/resync and shared configuration/readiness/routing, followed by multi-host
socket/process-loss tests before exposing the mode. Broader goal stays active.

### Accepted classroom bootstrap and client event scopes (seventy-second increment, 2026-10-28)

Discovery followed Core ClassHub sends, frame/revision/metadata authority, staged
arguments/delivery and actual SPA wrapper, observer, reconnect/breakout/media callers.
Mobile/SDK/shell have no direct ClassHub callers. Reuse existing family revision with
room epoch to fence A -> B -> A; no second stored binding version, DB schema, durable
Redis field, transport identity, dependency or country rule is introduced. New
ClassroomEventScope is a wire projection at the existing Core boundary.

Privately shared output wraps method/arguments in ClassroomEvent with accepted room/
epoch/revision scope; local wire stays unchanged. Original transport metadata remains
separate from frozen scope intent. Old-room cleanup is not relabeled as new-room
output when its actor moves. BeginJoinOutput marks target bootstrap; terminal events
retain the ending session after actor metadata unbinds. Equal scopes batch per existing
100-recipient lookup chunk, with normal fresh DB/metadata fences and charged overhead.

Shared JoinClass completion supplies protocol 1, accepted binding/outcome and expected
event count. The existing SPA wrapper buffers pending shared events until the accepted
scope and complete bootstrap are known, resets retained UI, then dispatches matching
events. Wrong room/epoch and revisions before the join floor are rejected. Same-room
resync uses the new floor; rejected targets preserve old content. Entering shared wire
is sticky: raw legacy events no longer update that connection.

Publication acknowledgement may precede Redis socket delivery, so allow a bounded
five-second wait for events at the exact acknowledged scope/revision. Future revisions
can queue without satisfying this bootstrap. Partial/duplicate/invalid bootstrap,
overflow or unknown shared join outcome closes the transport using existing localized
error/inactive handling; no mutation retry. Reconnect invalidates outstanding old
completions. Buffers are bounded by 16,384 events and 80 MiB conservative serialized
UTF-16 charge, with constant-time derived scope counts; this is not a JS heap promise.

SPA reconnect rejoins its current breakout ref instead of a stale initial closure.
Initial pending/denied/locked defaults reset before bootstrap. Existing peer callback
wiring is reused and fenced by actual current peer and connection references, so a
retired same-ID peer cannot signal/remove/replace its successor's media.

Logical backend event tests now explicitly assert every shared wire envelope. A
coordinator A -> B -> A case preserves epoch, advances the floor, preserves notes and
distinguishes old cleanup/new bootstrap scopes. Real JWT socket tests inspect actual
shared scopes/completion. Client checks cover all three locales, delayed/partial
delivery, old session events, rejected joins, same-room resync, reconnect/late results,
overflow, single-flight joins and no automatic replay. Evidence follows after final
full-suite and package validation. Earlier affected protocols: 40 passed, zero skipped
(/tmp/dm-classroom-fence-final-focused.log), before the final scope-intent/count changes.

Remaining before activation: protocol admission, configuration/readiness, Redis ClassHub
routing, actual multi-host sockets/process loss/recovery. This is not fleet readiness,
exactly-once delivery, Redis failover consensus or supported-user capacity evidence.
All seven broader completion requirements and remaining editor/write/invariant/query/
output/file/job/deployment/soak/restore audits remain open; keep the full goal active.

Final isolated Core: 447 passed, zero skipped
(/tmp/dm-classroom-fence-final-full-core.log), after scope-intent/event-count changes.
An earlier 447 pass preceded those changes and is not used as final evidence.
Client protocol checks pass in en-US/fa-AF/ps-AF, including delayed Redis delivery and
partial-bootstrap failure (/tmp/dm-classroom-fence-client.log); Core and installed
shell TypeScript pass (/tmp/dm-classroom-fence-spa-types.log,
/tmp/dm-classroom-fence-shell-types.log). Source commits: Core f55d8e2, SPA Core d02a93c.
Standard dotnet clean/build/pack/install/API build and SPA SDK/Core/country builds/
pack/install pass (/tmp/dm-classroom-fence-sync-dotnet.log,
/tmp/dm-classroom-fence-sync-spa.log). Country integration result follows below.

Producer/API installed SHA256 match:
Core 2cdfd1f513b039797965d786771d7964fcbbe9c7e94ceeff251b4a6c509938a2,
Abstractions 042e32a3a994eadf26509e47cc52eed7fdc1dd0f7150dbc34ed907216663da58,
country 4d3132b3fde76bbe295466aacb567939b5c9344d6b04b0ae45970424654e439d.
SPA producer/shell installed helper SHA256
0a8ec0189e8c4bcf0d1e1e0796facaa1d05c43f951e01333332a4dab8219c02e;
AppOnlineClass SHA256
67e5a3be5b3ca32ec14ca811e5d78b1d5addabde0a8f231287148d547416a789.
Lock integrity changes only consume this Core tarball: shell 27770df8, Afghanistan
SPA 5e6f24c, Austria SPA 87716de. All precommit build/type/locale/reuse gates pass.
No live DB/user Redis changes, user-server restart, public shared activation or push.

Afghanistan integration: 106 passed, zero skipped
(/tmp/dm-classroom-fence-country.log). API and backend country sources remain clean.
Next trace existing startup/backplane initialization and readiness; integrate shared
factory/policy/protocol admission and Redis ClassHub routing, then actual multi-host
socket/process-loss tests before activation. Retain all broader goal requirements.

### Configured shared classroom lifecycle and readiness (seventy-third increment, 2026-10-28)

Discovery traced existing SchoolAccessRegistration, API and fixture registration order,
NotificationBackplane/RedisOptions/multiplexer, worker/registry, hosted health, ready
checks, policy/index scripts and SPA URL. Extend existing delivery options and worker;
do not introduce another runtime/factory/provider or stored config/version. New Core
IHealthCheck projects actual host/worker/policy/index authority because notification
ping alone cannot verify classroom ownership or successful cleanup.

SharedState defaults false. When configured, shared admission/local sweeps stay closed
from construction, even before authority initialization and during outages. The existing
worker initializes the store with the notification multiplexer/prefix, 64 MiB family
cap, twice-operation lease and existing lifetime. Configured heartbeat cadence applies
before attachment, avoiding a spurious 30-second local-mode retry delay. Same worker
instance serves hosted execution and health. Core hosts without SignalR/Redis still start.

Existing @limits fingerprints runtime protocol/content/retention/lifetime/lease and
fleet policy; mismatches fail closed and require drain. Extend existing delivery options
with fleet school connections, host count/lease and pending admission. Require enabled
valid notification backplane and at least three operation budgets per host lease.
No DB schema, additional durable Redis field, service provider or dependency is added.

Core resolves local versus Redis ClassHub manager together with shared state, sharing
the notification connection factory. Public shared admission requires exact protocol 1
before consuming a slot; SPA Core advertises it. Internal attachment fixtures remain
available, but public configuration always enforces protocol. Readiness checks live
monotonic ownership, healthy recent cleanup, actual Redis manager and atomic existing
policy/index/host authority, with rechecks after awaits. Existing notification health
checks command/subscription connections. No provider details escape. Cleanup freshness
prevents healthy heartbeats masking a stalled cleanup indefinitely; repeated worker
warnings are rate limited while health records every cycle.

Twelve new checks cover local Core without SignalR, startup configuration validation,
two configured real JWT Kestrel/WebSocket hosts, cross-host notes, graceful restart/
retained content, fleet cap/retirement, unsupported clients, incompatible policy,
initial Redis outage/no local admission and runtime private Redis restart/new actual
ownership/session. No test manually attaches a shared store for these public paths.
Full isolated Core: 459 passed, zero skipped (/tmp/dm-classroom-registration-full-core.log).
Final registration cases with stronger direct admission/policy assertions: 12 passed,
zero skipped (/tmp/dm-classroom-registration-verified-focused.log). An earlier test-only
helper access error was corrected by reusing the existing internal reflection helper.
Client checks in all three locales and Core TypeScript pass
(/tmp/dm-classroom-registration-client.log, /tmp/dm-classroom-registration-spa-types.log).
Package/consumer evidence follows after the standard sync.

This supplies an opt-in public path, superseding internal-only routing; no live/default
setting was enabled. Matching client deployment, protected no-eviction authoritative
Redis, affinity and policy drain are required. Two hosts share one test process:
actual abrupt separate API process loss, representative multi-school load/soak and
restore/recovery evidence remain before production rollout. Non-persistent fixture
Redis restart loses history; it does not prove durable restore or HA consensus.
All seven broader requirements and editor/write/invariant/query/output/file/job/
deployment audits remain open; retain the full goal rather than claiming fleet capacity.

Source commits: Core c45ac47, SPA Core 9580353, API deployment docs 60b6662.
Standard clean/build/pack/install/API build and SPA SDK/Core/country builds/swaps
pass (/tmp/dm-classroom-registration-sync-dotnet.log,
/tmp/dm-classroom-registration-sync-spa.log). Installed shell TypeScript passes
(/tmp/dm-classroom-registration-shell-types.log). Afghanistan integration: 106 passed,
zero skipped (/tmp/dm-classroom-registration-country.log).
Producer/API SHA256 match:
Core 252dd379bb14247b14bc7ca234e714554200ddca25f18eea1c0918a11f806313,
Abstractions f185366ef2ca8003a6fb24830f3f52616ff387c6d261b55b99549c625f55541e,
country 4381dc04677ecd765cf0ab2c3b36560ad2ee3d3bb98d79c0350f61d2a53c004f.
SPA Core producer/shell installed connection helper SHA256 match
e6dfc1b3fbda1ea9c1983ead1bc2c87b9551b2b2e0dbb6eb9c42d688e94c41e4.
Tarball-lock-only consumers: shell 61d74cf5, Afghanistan SPA f0a42fb, Austria SPA a1a6f42.
Precommit build/type/locale/reuse/route/hosted-service/isolation gates pass. Backend
country source stays clean. No live DB/user Redis changes, manual API/SPA restart,
enabled live shared setting, new dependency or push.

Next extend the existing isolated full-API process harness for abrupt classroom-host
loss and surviving-host cleanup/reconnect, with private PostgreSQL/Redis and actual
process handles. Do not substitute graceful same-process host restart for this gate.
Then continue the wider query/editor/write/job/output/file/load/deployment audits;
all seven completion requirements remain open and the original goal stays active.

### Actual separate API classroom process loss (seventy-fourth increment, 2026-10-28)

Reuse discovery traced the guarded full-API load driver/entry point, private DB/key
ring, actual child handles and prior financial crash recovery, plus Core's existing
ScopeSocket. Extract/link that verification client instead of copying a WebSocket
implementation or adding a dependency. Subscription rejection throws a framework
exception rather than a test-framework assertion so the same source can run outside
xUnit. No production Core/runtime/domain/schema behavior changes in this increment.

`bash scripts/tests/run-full-api-load.sh --classroom-recovery` reuses the existing
fixture/multi-process setup, adding private Unix Redis and matching shared settings.
It runs actual API entry points/installed packages, JWT login/auth, real middleware,
SignalR/state/worker implementations and separate API processes. Only outbound mail
is replaced; an explicitly enabled bounded inner test filter pauses the real SetNotes
body after Core auth/admission/lease selection. The driver independently reads the
selected family's actual unexpired Redis owner, SIGKILLs its owned process handle,
waits for exit and verifies the kill signal. Redis stays alive; no developer service,
user data, listener 5000/3000 or live configuration is used or stopped.

The survivor reclaims three transports in AT main/breakout and AF main rooms, while
ordinary liveness remains available. Exact dead-peer events, retained notes/session
epochs, absence of the paused uncommitted write and cross-school denial are verified.
Restart the killed actual API on another random private port, require readiness and
verify fresh join/history plus cross-host routing. Do not replace this with graceful
host shutdown or test-only authority attachment. The C# client waits for acknowledged
complete scoped bootstrap, including Redis delivery arriving after completion.

Initial successful run: /tmp/dm-classroom-process-recovery-final.log, three reclaimed
connections, 5033.67 ms cleanup after confirmed kill, retained epochs/notes, absent
uncommitted write, tenant denial and restarted routing all true. It used Core c45ac47
before the shared helper extraction was committed. The first attempt reached the
actual kill but mistook a prior pupil breakout UserLeft for crash cleanup; explicitly
verify/consume that legitimate move before arming, preserving exact dead-peer checks.
Final installed-package run and stronger explicit child-epoch assertion follow below.

Full isolated Core after helper extraction: 459 passed, zero skipped
(/tmp/dm-classroom-socket-extraction-core.log). Core local commit b76261f; precommit
Release/locale/enum/hosted-service/isolation gates pass. Final package and unchanged
mixed-workload regression evidence follow. No production capacity or throughput is
inferred from one bounded crash scenario. Redis failover/durable restore, representative
classroom load/soak, deployment recovery and all seven wider editor/write/invariant/
query/output/file/job/performance audits remain open. Preserve the full goal.

Final installed-package crash run: /tmp/dm-classroom-process-installed.log, including
the explicit child-epoch assertion. Actual unexpired lease observed, SIGKILL confirmed,
three dead transports reclaimed in 4939.82 ms after driver confirmation, retained AT/
AF main and child notes/epochs, absent paused write, tenant denial and restarted
routing all pass. This is one bounded local recovery observation, not a latency SLA.
It ran Core b76261f and API 60b6662; the subsequent API f05c5e4 change is deployment
documentation only. The existing mixed mode was then rebuilt against API f05c5e4.

Unchanged mixed-workload regression: /tmp/dm-classroom-process-mixed-regression.log,
four schools (two AT/two AF), 1.15 seconds mixed phase, 532 attempts/530 successful
responses. The verifier also completed its original replay, cancellation, report,
import/export and interrupted-payment process-loss/restart checks. All four persisted
schools have 402 students/enrollments, 11 classes, maximum class size 40, zero capacity
violations/duplicate active placements, two current attendance marks and one edited
profile; AT has zero Afghan extensions. Financial counts/balances match the original
recovery assertions. This one-second regression is not a replacement for the earlier
longer benchmark or production load/soak evidence.

Standard clean/build/pack/install/API build pass (/tmp/dm-classroom-process-sync.log).
Afghanistan integration: 106 passed, zero skipped (/tmp/dm-classroom-process-country.log).
Producer/API installed SHA256 match:
Core 8971718997b14ae3c356cd0c1d3d6ada59e17b1e17d3c2cc699ea28b149bfb9b,
Abstractions 555d5f4c48d893dc1533c5e7e9ba35ede61c50eccbbb614e30f099cb183d35ae,
country c8e715a25db1c6486b4b7bd448876c04e534bca20a574473c6a21239e69440fd.
API docs commit f05c5e4; backend country and all SPA sources remain clean/unchanged.
Source hashes/runtime identities are included in both actual-process reports. No
user process, live database, developer Redis, configuration or server was changed;
no dependency or public test route was added and nothing was pushed.

Next: representative classroom load/resource/soak checks using the same actual process
harness, Redis recovery/restore constraints, and the wider remaining query/editor/
mutation/job/output/file/deployment audits. This closes the specific abrupt API-process
scenario, not the seven broader completion requirements or whole goal.

### Classroom traffic/resource short soak (seventy-fifth increment, 2026-10-29)

Discovery reused actual-process setup, four-school fixture accounts, ScopeSocket,
login/bootstrap helpers, RuntimeProbe and existing production classroom meters. No
new parallel client, production instrument, domain model or dependency. Shared test
socket keeps its 64 Ki frame-character default with a bounded optional larger limit;
load uses 4 Mi for actual retained histories. Existing recovery helpers are exposed
within the verifier rather than copied. Core production behavior is unchanged here.

`run-full-api-load.sh --classroom-load --classroom-seconds 120` (5–600 seconds) selects
a closed synthetic profile: four AT/AF schools, two actual API processes, 24 sockets,
eight unpaced clients in a hot school and four paced clients in each other school.
Distinct typing/mic/chat operations run with concurrent authenticated paged student
reads. Busy responses must match Core's actual localized resource; unexpected errors
fail, and failed mutations are not replayed. Validate all-school progress, tenant/
room/epoch payloads, unique bounded histories and acknowledged bootstrap.

Fixed 512-bucket logarithmic latency histograms store no per-request samples. Existing
runtime/classroom meters and 500ms bounded process/GC summaries are observed; no forced
GC. After disconnect, connection/method/publication/scratch-frame accounting must
settle to zero, alongside Redis connection/pending/by-host indexes, with four retained
historical roots. Frame counters are not fleet retained-room counts. Known private
Redis indexes/memory are read separately; no scan/delete of developer state occurs.

The report explicitly records smaller fixture budgets (8 calls per host, 2 calls per
school per host, 4 publications per host), fleet connection caps (32/16), and login IP limit
1000 instead of production's ten. Resource checks are sampled scenario guards: 1 GiB
working set/512 MiB uncollected managed heap per API. They are not hard process caps,
exact retained heap or production sizing. No error is silently accepted to meet them.

Two-minute run /tmp/dm-classroom-load-soak.log: 120.103 observed seconds, 288002 delivered
events, 49582 accepted hub calls plus 8398 ordinary list requests, and 1277373 busy hub
completions. Every school progressed; all four histories reached exactly 500 unique
messages without cross-tenant content. Ordinary list p95 histogram upper bounds were
11.74–12.96 ms; all lists succeeded. Redis used 2567776 bytes/peak 3798352, four roots,
zero connection/pending/by-host records after disconnect.

Sampled working-set peaks: API B 680869888 bytes, A 679690240. Managed heap peaks:
B 402866200, A 422521008. Final sampled heaps were 189587016/135910272 respectively.
Cumulative allocation was 131852361360/128450859008 bytes and CPU 499.97/491.14 seconds.
The unpaced flood keeps retained state bounded but exposes costly overload churn.
This is an unresolved allocation/CPU optimization target; investigate expected-busy
handling while preserving visible rejection, diagnostics and no mutation replay.
Do not conclude that bounded memory means rejection efficiency or the goal is done.

The soak used Core b76261f; its source/runtime identities and fixed histogram/resource
summaries are in the report. Five-second smoke /tmp/dm-classroom-load-smoke.log passed
before it. Full Core after the helper option: 459 passed, zero skipped
(/tmp/dm-classroom-load-socket-core.log). Core helper/docs commit a199f36; standard
package/consumer checks and final stronger gate-accounting smoke follow below.

Two minutes is not long-duration leak proof, deployment load or production capacity.
Redis recovery/restore, longer representative soak, overload efficiency and all seven
wider editor/write/invariant/query/output/file/job/deployment requirements remain open.

Resource counters above cover API process lifetime, including startup/preparation,
not only the timed traffic interval; they are sampled aggregates, not heap snapshots
or allocation-stack attribution. The high allocation/rejection correlation is a
profiling lead, not proof that one specific logger or serializer causes it. Captured
verification stdout is now rotated at 1 MiB plus one backup, and bounded failure
diagnostics also retain metric/resource summaries. API logger behavior is unchanged.
The two-minute run predates this stdout-retention change and stronger final gate-sum
checks; it is not silently relabeled as a final-source benchmark.

Final five-second installed-package scenario passes
(/tmp/dm-classroom-load-final-smoke.log), including zero connection/method/publication/
frame sums after disconnect, zero admission indexes and rotated stdout. Core a199f36
and API deployment-doc commit 5906752; all precommit build/locale/reuse/route gates pass.
Standard clean/build/pack/install/API build passes (/tmp/dm-classroom-load-sync.log).
Afghanistan integration: 106 passed, zero skipped (/tmp/dm-classroom-load-country.log).
Producer/API SHA256 match:
Core 150f94fdeb9aa391f12efaefc05558d49ba857cf3519bcbc8dadea09b2cb51e7,
Abstractions 0fd4c421242d0efb5edd1851f45c9937922f4678897bdbeb3806708f03665cb8,
country 58d238510e40c4ab22c8abb2a7754c51ffcefa9dfe13fcab6c35df1849225bd5.
The unchanged mixed-mode regression result follows below. No live database, developer
Redis, user API/SPA restart, live setting, dependency addition or push.

Mixed-mode compatibility regression passes after the shared probe/log-capture changes
(/tmp/dm-classroom-load-mixed-regression.log), including its existing persisted
registration/payment/enrollment/attendance/tenant invariants and interrupted-payment
restart/replay. This is a short one-second regression, not a new throughput benchmark.
All SPA and backend-country sources stay unchanged; no package/API contract was added.
The root verifier and documentation carry the new profile and recorded evidence.

Next investigate the measured overload-path allocation/CPU cost, tracing existing
RequestCapacity/HubFilter error contracts, framework dispatch and actual SPA handling
before changing behavior. Preserve visible localized failures, outcome uncertainty,
diagnostics, compatibility and no automatic mutation replay. Large-payload/media/board
traffic, longer deployment-specific soak/restore and the wider outstanding audits
remain required. All seven completion requirements stay open; do not shrink the goal.

### Negotiated classroom overload efficiency (seventy-sixth increment, 2026-10-29)

Discovery traced RequestCapacity's HTTP ProblemDetails/server_busy/localized detail,
shared throttle failure handling, ClassHubAccessFilter, shared invocation/join output,
SPA connection callers, runtime policy fingerprint and actual SignalR dispatcher.
Reuse the existing problem shape and retry setting through RequestCapacity.BusyProblem;
no persistent field, table, parallel error DTO, retry queue or dependency is needed.
Shared Core owns capacity semantics; SPA Core validates and presents failures for all
consumers. Country-specific rules and data are unchanged.

Configured shared clients now negotiate classroom protocol 2, including query, join
acknowledgement and existing runtime fingerprint. Expected public capacity/admission
misses return the same localized problem through SignalR completion rather than throw
routine dispatcher exceptions. Default local clients retain their exception contract.
Actual .NET 8 dispatcher behavior supports filter results even on Task hub methods;
see Core docs/CLASSROOM-STATE-AUDIT.md increment 76 for primary source and trace.
Unexpected/store/JSON/DB/deadline failures retain exception diagnostics; no framework
or global logging suppression was added. The HTTP contract gains a compatible
retryAfterSeconds hint alongside its existing header, status and no-store behavior.

SPA validates status/code/detail/retry bounds and rejects an Error carrying them, so
busy completion cannot appear successful. No automatic mutation replay or cooldown.
Failed joins retain unknown-outcome handling and require a fresh connection, since
failure before acknowledgement does not establish that nothing committed. Unsupported
acknowledgements/malformed problems fail closed. Late successful non-join completions
also respect the existing account/reconnect generation fence. Shared rollout requires
matching clients/hosts and draining v1 transports/replicas; active policy disagreement
fails closed. This is not a silent mixed-version live upgrade.

Core 63c51cf: focused 42 pass (/tmp/dm-classroom-busy-focused.log), full 462 pass,
zero skipped (/tmp/dm-classroom-busy-full-core.log). Three actual JWT/WebSocket locale
cases hold the real gate and root lease: visible localized busy result, no notes write
and no routine dispatcher error. An injected unexpected exception still reaches the
client as failure and records the dispatcher error. SPA a61a087's connection tests
pass in English/Dari/Pashto, including malformed/v1 output, no replay, failed join and
late old-account success. Core and installed shell TypeScript pass. No translation
strings were duplicated; existing localized Busy resources are authoritative.

Installed actual-process five-second smoke passes (/tmp/dm-classroom-busy-smoke.log).
Same two-minute synthetic traffic profile as increment 75 passes
(/tmp/dm-classroom-busy-soak.log): 120.107 seconds, 54558 accepted hub calls,
8495 successful ordinary list requests and 2655320 structured busy completions with
zero exception-form busy completions. Delivered 317358 events; all four AT/AF schools
progress, histories each contain 500 unique messages, tenant/room/epoch checks pass.
Ordinary list p95 histogram upper bounds are 10.38–12.34 ms. Connection/method/
publication/frame gates settle to zero after disconnect; Redis connection/pending/
by-host counts are zero and four historical roots remain. Redis used 2576320 bytes,
peak 3839280. No mutation retries and no hidden accepted busy operations.

Sampled API A/B working-set peaks are 693649408/696582144 bytes, managed heap peaks
446807424/424882640 and final heaps 141244520/97349008. Total lifetime allocation is
234992392952 bytes and CPU 937.03 seconds, including startup/preparation. Compared
with increment 75's 260303220368 bytes/991.11 CPU seconds over 1335353 completions,
this run completed 2718373 operations: about 86.4 thousand bytes/completion versus
194.9 thousand bytes/completion (55.7% lower), and 0.345 versus 0.742 CPU ms/completion
(53.6% lower). These are aggregate ratios, not isolated rejection allocation costs.
The unpaced workload changes the accepted/busy mix; prior baseline also predates
stdout rotation and stronger final cleanup assertions. This is local comparative
evidence, not controlled A/B attribution, profiling stacks, a throughput guarantee,
production sizing or long-duration leak proof. Absolute allocation remains high;
accepted history/output serialization and other paths still need profiling.

Actual installed API SIGKILL recovery passes (/tmp/dm-classroom-busy-recovery.log):
three connections reclaimed in 6860.82 ms across AT main/breakout and AF main, observed
held lease, preserved notes/epochs, absent paused write, foreign-school denial and
restarted routing. Redis remains alive; no durability/failover claim. Afghanistan
integration: 106 passed, zero skipped (/tmp/dm-classroom-busy-country.log). Standard
clean/build/pack/install/API build and SPA build/pack/install pass
(/tmp/dm-classroom-busy-sync-dotnet.log, /tmp/dm-classroom-busy-sync-spa.log).
Release producer/API installed SHA256 match:
Core ea44a9b03a6a969f37f5425fc9382e9788a847a2469258b4d72f5ce19cbba4cb,
Abstractions 99d9d16ed04a16921ed5f6095dedf1c4e20fdbccf0c135bf314032a3fd0958e5,
country 75d4667271a05dd6af0a6253254f012cb59c8c8ae5298b0501666b3150ae6928.
API documentation commit ea86bf3; SPA consumer lock-only commits AF 2970fa3,
AT 87f3035, shell 3874901c. Existing package, locale and component-reuse gates pass.
Mixed-mode regression follows below. No live database, developer Redis, user server
restart, production setting change or push.

All seven broader requirements remain open. Next: profile remaining allocation and
representative large classroom payloads, longer deployment-specific soak/restore,
and complete the wider editor/write/invariant/query/output/file/job audits. This
increment closes routine negotiated busy exception churn, not the broader goal.

Mixed-mode installed-package regression passes
(/tmp/dm-classroom-busy-mixed-regression.log), including persisted registration,
enrollment/capacity, attendance, tenant and financial assertions plus interrupted-
payment restart/replay. This one-second phase is compatibility evidence, not a new
throughput benchmark. All affected repositories receive local commits only.

### Large retained classroom payload verifier (seventy-seventh increment, 2026-10-29)

Discovery traced existing ClassHub chat/file/body limits, WireBytes/HistoryMessageBytes,
notes truncation, whiteboard stroke/total limits, join bootstrap, ClassroomComponents,
ScopeSocket and root's process/load/resource helpers. Reuse the same authoritative
state and byte budgets. No production field, service, component, protocol or dependency
is added. This increment extends the existing isolated verifier only; shared behavior
remains in Core and all production packages are unchanged from increment 76.

`run-full-api-load.sh --classroom-load --classroom-payloads --classroom-seconds 120`
keeps the two API processes/four AT-AF schools/24 sockets and ordinary student reads.
Seed each room with 99,999-character Dari notes, eight opaque JSON strokes with 245760-character
point strings (under each existing 262144-character limit) and six 393216-character
base64 binary attachments. The ninth stroke crosses the existing 2 MiB board budget
and must return the actual localized ContentLimit. Initial/final full snapshots verify
all eight original strokes and exact Dari notes, establishing no partial overflow
write. Chat eviction obeys the existing 2 MiB/500-message limits. Steady traffic mixes
attachments with chat, typing and mic operations. Check attachment names/data and
room/epoch/tenant scope; no retries or silently accepted busy results.

The optional receive-frame guard is 16 Mi characters for the verification client,
within ScopeSocket's existing allowed range; short-message mode keeps its 4 Mi guard
and ScopeSocket's ordinary default stays 64 Ki. Production hub receive limit, Redis
history/content budgets, resource ceilings and gates are unchanged. Snapshot parsing
and transport integrity are not browser rendering, valid file contents, device heap,
WebRTC/media quality or malicious attachment scanning evidence. The initial 5.246s
smoke passes (/tmp/dm-classroom-payload-smoke.log); it predates the final additional
attachment-byte/name and retained-board-byte reporting assertions, so final evidence
must use the subsequent run rather than relabel the first smoke.

Final-source two-minute run passes (/tmp/dm-classroom-payload-soak.log): 120.163s,
8327 accepted hub calls, 7740 successful ordinary list reads, 191684 structured busy
completions and zero exception-form busy completions; 48561 scoped events delivered.
All four schools progress and retain valid file-bearing chat histories. Final chat
counts AT0/AT1/AF2/AF3 are 7/10/12/10 with 1968323/1969053/1969545/1969055 bytes;
each board retains exactly eight strokes totaling 1966952 bytes and unchanged notes.
Ordinary list p95 histogram upper bounds are 24.63–25.87 ms. This larger workload is
not equivalent to increment 76's short-message traffic and cannot establish a before/
after optimization comparison. Content-limit exceptions here are intentional board
validation, distinct from overload results; unexpected failures still fail the run.

Sampled API B/A working-set peaks: 630341632/611500032 bytes. Managed heap peaks:
336912080/337451640, final heaps 198032080/165475272. Cumulative lifetime allocation
142132827032/136852018512 bytes, CPU 532.67/522.85 seconds, including setup. Limits
passed without forced GC; these aggregates do not attribute allocation stacks or
establish retained-heap/leak/production sizing. Absolute allocation remains an open
profiling target. Redis used 20204208 bytes/peak 34681184, four retained historical
roots, zero connection/pending/by-host records after disconnect; all active gates
settled to zero and both API hosts regained readiness. Retained history is expected
state, not disconnected-peer metadata leakage.

The report records exact deployed identities (Core 63c51cf, API ea86bf3, country
bde0c5b) and source hashes, including ClassroomLoad SHA256
d5c57355a30274987aae7ba2c5c0a20cfd5ca9f3b0347bf1da4c0fe6dcd15596.
No production source/package changed, so increment 76's 462 Core/106 country results
remain the applicable package evidence; no clean/build/pack swap is needed here.
Verifier builds, Python syntax, shell syntax and invalid CLI combination rejection
pass. Short-message compatibility run follows below. No live database, user API/SPA
or developer Redis was touched, restarted or stopped. Only private owned fixtures
and processes were reclaimed; no deployment or push.

Next discovered shared read gap: SchoolCalendarController.GetCalendar has no maximum
date span, no row bound and no cancellation on its three initial materializations;
module contributors are added afterward. Trace existing calendar query contracts,
SPA month navigation and country contribution behavior before extending shared Core.
All seven broader requirements remain open; large-payload transport/state evidence
closes this verification gap only. Longer representative deployment soak, restore,
profiling and remaining editor/mutation/invariant/query/output/job audits still apply.

Final short-message profile regression passes
(/tmp/dm-classroom-payload-short-regression.log), including the original workload,
retained-history/scope assertions, ordinary read progress and zero released gates/
admission indexes. Both workload choices now have actual installed-API evidence.

### Bounded composed calendar reads (seventy-eighth increment, 2026-10-29)

Discovery traced SchoolCalendarController, Holiday/SchoolEvent/Exam entities, existing
SchoolCalendarDto, ISchoolCalendarContributor, module applicability, the Afghan period
repository/contributor, actual SPA monthly caller/API client caching and existing
useReloadableRead. No persistent field/table/service/DTO/component or migration is
needed. Shared limits belong on the existing Core contributor contract; Afghanistan
uses those limits in its existing repository instead of introducing a second query
service or country-specific copy of shared behavior.

Core interactive windows accept at most 366 inclusive days and 5000 composed entries.
All three queries project only calendar fields, use deterministic bounded SQL LIMITs
with a sentinel, no tracking and RequestAborted. Overflow returns localized 413 asking
the caller to narrow the window, never successful truncation. Preserve existing date/
overlap/exam-start and active-module semantics. Module contributions stay sequential,
with cancellation before/after await/enumeration and raw/cumulative row checks. The
Afghan period range query uses MaximumEntries+1 and stable date/ID order; Core rejects
its sentinel. Existing contract signatures and calendar response shape stay compatible.

Both server and SPA calendar API are no-store; old offline snapshots are not fallback
calendar truth. The actual monthly screen reuses useReloadableRead rather than keeping
another read lifecycle. It displays bounded localized server problem detail and hides
old account/language/window results. Open day details retain their exact source array
identity; a different/cleared snapshot immediately hides the modal rather than exposing
previous account details. Existing Core calendar primitives retain Gregorian/Solar
Hijri rendering and theme behavior. No new frontend translation keys are needed;
backend range/overflow guidance ships in English/Dari/Pashto.

Three new real PostgreSQL tests cover scoped holiday/event/exam/module aggregation,
foreign school/module exclusion, no tracking, 5000 complete rows, Core overflow,
cumulative module overflow, actual SQL LIMITs, inclusive leap-year window boundary,
inverted ranges and cancellation before/after contributor calls. Focused three pass
(/tmp/dm-calendar-bounded-focused.log); final full Core suite 465 passed, zero skipped
(/tmp/dm-calendar-bounded-full-core.log). Initial focused compilation/fixture failures
were corrected before the full run; those failed attempts are not passing evidence.
Core implementation/docs commit 7c9d7cb; SPA Core f5ee8f9; Afghanistan 8f4b4bd;
API documentation 4f7e82a. Full clean/build/pack/install/API build passes
(/tmp/dm-calendar-bounded-sync-dotnet.log); SPA package build/pack/install passes
(/tmp/dm-calendar-bounded-sync-spa.log). No user-owned server was restarted.

Actual calendar screen + existing real Core read-hook tests pass in all three locales
(/tmp/dm-calendar-bounded-read-lifecycle.log): localized 413 guidance, no-store request,
account-change cancellation, late old result rejection, current snapshot render and
immediate hiding of previous account's open day modal. Existing report/snapshot/read
lifecycle tests also pass in that same verifier. Gregorian/Solar Hijri SPA/mobile time-
zone regressions pass (/tmp/dm-calendar-bounded-timezones.log). Core/shell TypeScript,
locale coverage and component reuse gates pass. This is DOM behavior evidence, not a
new browser geometry/visual inspection; calendar primitives were not changed.

Producer/API installed SHA256 match:
Core 28a0ffa54bea75e3c05807f37d269042a15b9600823a3ab917f81f7e77a1b620,
Abstractions 85d30e3d11a5f639b33c550f58726b24b2e5e004aaed8d2f5db7398bd03af290,
country 841e9591191b806929ee64485a3616bdb279f4a3881d570fc1a8fd3ccec830db.
Consumer lock commits AF bf73657, AT 601dea3; shell 94bfea35 plus modal-scope follow-up.
Final installed country integration follows below. No live database, developer Redis,
production setting, dependency addition or push. Disposable PostgreSQL fixtures only.

Limits bound date span/materialized row counts, not arbitrary legacy text byte size,
trusted module allocations or fixed elapsed time. No cross-query snapshot guarantee
is introduced. Representative calendar SQL/index plans, holiday list/CRUD concurrency,
other record editors/important mutations/invariants/query/output/job audits, allocation
profiling and longer deployment load/restore checks remain. All seven original broader
completion requirements remain open; this closes the composed calendar read gap only.

Final installed Afghanistan integration: 106 passed, zero skipped
(/tmp/dm-calendar-bounded-final-country.log), including actual HTTP no-store checks
and Core/country/school composition in all three locales. Shell modal-source commit
19a04a51 passes its TypeScript/locale/reuse gates. Producer and consumer worktrees are
clean before the root evidence commit. No whole-goal completion is inferred.

### Measured calendar read indexes (seventy-ninth increment, 2026-10-29)

Discovery inspected existing Holiday/SchoolEvent/Exam columns, model/snapshot, PK/FK
indexes, migrations, bounded controller SQL, monthly caller and plan helpers. Existing
indexes do not serve tenant/window reads. Reuse ConcurrentReadIndex's canonical-key/
operator-class/validity validation and transaction-suppressed concurrent creation,
plus ReportQueryCapture and the existing calendar controller/fixture tests. No new
service/helper, persisted field, table, SQL extension or duplicate calendar state.

Guarded private PostgreSQL measurement seeds 40001 rows per table across two tenants
with repeated multi-year dates, then invokes the actual controller for one month.
Baseline uses three full-table scans. Trial indexes improve holidays/exams, but a
simple SchoolEvent(SchoolId,StartAt,Id) still gets a full scan for effective-end
overlap. A second trial matching COALESCE(EndAt,StartAt) improves the event plan.
Trial measurements are /tmp/dm-calendar-access-baseline.log and
/tmp/dm-calendar-access-expression.log; only the verified final migration is shipped.

CalendarReadIndexes uses Holiday(SchoolId,FromDate,ToDate,Id),
SchoolEvent(SchoolId,COALESCE(EndAt,StartAt),StartAt,Id), and
Exam(SchoolId,StartAt,Id). These index existing values; no duplicated effective-end
column. EF property indexes/model snapshot cover Holiday and Exam; the event expression
is migration-owned because EF8 cannot describe expression keys. Existing PK/FK indexes
remain authoritative for constraints/other joins. Core owns these shared access paths;
country modules require no new indexes or forked query logic here.

Focused actual-migration verifier passes (/tmp/dm-calendar-access-migration.log):
195 complete month entries both before/after. Holiday bitmap scan: executor
1.807→0.237 ms, shared buffers 622→100; event bitmap scan 1.868→0.178 ms,
buffers 662→79; exam index scan 2.006→0.024 ms, buffers 858→56. Planner choices
are asserted without disabling scans or forcing indexes. Small interval-result sorts
are retained; no unbounded result or hidden partial calendar is accepted.

Warm local EXPLAIN ANALYZE numbers are not production HTTP latency/capacity, cold I/O,
or full-app throughput. Controller stopwatch includes extra EXPLAIN executions and
is not a normal request timing. This profile has null event EndAt; the earlier Core
calendar behavior tests cover non-null spanning overlap, but additional distributions
remain useful. No broad index-performance claim is inferred from one fixture.

The same verifier replays Up without rebuilding a valid index (OID preserved), rejects
a wrong named exam definition, exercises controlled Down/Up/Down and verifies source
row preservation. CREATE/DROP operations are transaction-suppressed. Validation never
automatically removes unknown/invalid production definitions; inspect/repair and
coordinated retry remain operator actions. No live user database/schema was changed.
Full suite, final packages and country integration follow below.

Final Core: 466 passed, zero skipped (/tmp/dm-calendar-access-full-core.log), including
migration rollback/replay/invalid-definition and actual plan checks. Core commit
61b40f0; API rollout documentation 9304869. Normal clean/build/pack/install/API build
passes (/tmp/dm-calendar-access-sync.log), with producer/API installed SHA256 equal:
Core 09f54076368a21c7330fbcdf416aab10743b3a7e46227cbc641da637b867c203,
Abstractions 1fde1aab88518635b9823530a05af72184236435e4e00176906707e5e8d73005,
country ac3101ec155c775238367f3f83b136a426b7725635087dab7e12ecd4b4eda09c.
Backend-country source remains 8f4b4bd; all SPA/mobile sources/packages are unchanged
this increment. Existing locale, enum, worker-health, abstraction-isolation and API
rate-limit-route gates pass. Country integration follows below. No user server was
restarted and no database/index outside disposable fixtures was touched; nothing pushed.

Next confirmed calendar gaps: ListHolidays still materializes the entire school list
without cancellation; the Holidays screen fetches that list into local state, and
create/delete have no durable request-intent/unknown-outcome handling. Trace existing
paging/filter/export, mutation receipts and Core intents before changing these paths.
Keep all seven broader completion requirements open, including remaining editors,
important writes, invariants, query/output/job audits, allocation profiling and
longer deployment-specific load/recovery/restore proof. This measured index change
does not complete those requirements or establish a full historic migration-chain
upgrade: its migration test executes generated commands against existing fixture
schema, not every historic schema version.

Installed-package Afghanistan compatibility: 106 passed, zero skipped
(/tmp/dm-calendar-access-country.log). All affected producer/consumer worktrees are
clean before the root evidence commit; only its persistent instructions/plan changed.

### Holiday table paging (eightieth increment, 2026-10-29)

Discovery followed SchoolCalendarController.ListHolidays, Holiday/DTO/mapper audit
resolvers, GeneralParams/TableQueryFilters/PagedList, actual holiday screen, shared
API wrapper/buildParams, AppTable loader/filter/export/reloadKey/cancellation and
existing write-intent/receipt contracts. Country/mobile/SDK searches found no other
shipped list caller. The calendar window and automation sources query independently.
Reuse existing components and contracts; no persistent field/table, parameter type,
repository/service/DTO or second UI read/cache implementation is needed.

Holiday reads now return the standard array plus Pagination header, default 10/max
50 rows. School + case-insensitive name search + applied creation-date bounds combine
before stable whitelisted name/fromDate/toDate/description sorting with an ID tie.
Use AsNoTracking, RequestAborted, shared bounded PagedList and batched UserResolver
priming before the existing DTO mapper. Extreme pages reuse the safe empty-page path.
No-store applies server/client; no offline snapshot fallback for this list.

The actual screen's placeholder fetcher/full-list mount effect/local items cache are
removed. AppTable calls the real shared paged API loader with all criteria and signal,
serverSort and reloadKey; its existing all-pages export path is authoritative. Name
filter uses the existing searchTerm accessor. Confirmed writes/manual refresh trigger
shared table reload without a second data owner or fetch lifecycle. This does not
change the separate complete bounded calendar window. Ship Core, SPA Core and shell
together; old no-argument list clients receive only the default page.

Real PostgreSQL focused test passes (/tmp/dm-holiday-pages-focused.log): 60 name/date
matches split 50/10 in globally stable descending order, no overlapping page IDs or
foreign school records, max-page clamp, SQL LIMIT, bounded audit query count, no
tracking, safe extreme page and cancellation. The screen/actual API wrapper test
passes (/tmp/dm-holiday-pages-client-wiring.log): complete filters/sort/page/signal/
no-store forwarding and reloadKey without a duplicate full-list effect. Shared table
filter/cancellation lifecycle passes (/tmp/dm-holiday-pages-table-lifecycle.log), and
PDF workflow passes (/tmp/dm-holiday-pages-export-lifecycle.log). These verify different
layers; no single mock test is presented as end-to-end database/export proof.
Full Core/package/country evidence follows below.

Additional actual AppTable PDF scenario now passes in the same PDF workflow verifier:
101 matching records loaded over three 50-row requests; every request retains applied
name/creation-date criteria and AbortSignal. Generated PDF contains the first and last
records (pdftotext available for extraction); the modal reaches Ready without opening
a page early. This strengthens all-page export evidence beyond the existing cancelled-
page scenario. The HTTP response body remains supplied by the test transport; actual
PostgreSQL filter/paging behavior is independently tested above.

Final Core: 467 passed, zero skipped (/tmp/dm-holiday-pages-full-core.log). Core source/
docs f0a089c, SPA Core 38a63ab, API compatibility documentation 00906d3. Normal backend
clean/build/pack/install/API build passes (/tmp/dm-holiday-pages-sync-dotnet.log), and
SPA package build/pack/install passes (/tmp/dm-holiday-pages-sync-spa.log). Installed
shell TypeScript passes (/tmp/dm-holiday-pages-shell-types.log); strict locale/reuse,
enum, worker-health, abstraction and API route gates pass. Earlier shell checks used
old installed API typings and caught a reload-key type error; final source/package
checks supersede those failed attempts. No translation keys were added.

Installed Afghanistan compatibility: 106 passed, zero skipped
(/tmp/dm-holiday-pages-country.log). Producer/API installed SHA256 match:
Core 493d922fc4b9bf63aef663ffabf7293bdc6bdff567136c749f3edffdf355f437,
Abstractions f09a43bfe2fbb942192d99b11e2eedee2994d043c57ac83bd979e41fff8dc85c,
country 52216279c359fac747095bb13de0dffa4c833ab92093f82ac3606276e4e9495c.
SPA consumer commits: AF 41c334a, AT fceb7c9, shell f6d0d571. Backend country source
stays unchanged; no migration/index/field was added this increment. No live database,
developer Redis, user server restart, production setting change or push.

Holiday create/delete durable intent, changed-payload rejection/replay/current-authority
checks and UI unknown-outcome handling remain the next write audit. This read change
only removes the unbounded list/placeholder-loader gap. Count/page and all-page export
requests do not claim a shared point-in-time snapshot. All seven broader requirements
remain open, including the other editor/write/invariant/query/output/job audits,
allocation profiling and longer deployment load/recovery/restore verification.

### Durable holiday create/delete (eighty-first increment, 2026-10-29)

Discovery traced Holiday/DTO/validators/mapper, write callers, shared receipt/encryption/
fingerprint transactions, BaseController authorization, AuditInterceptor, row-lock
patterns, existing UI intents/account config/submit button and test hosts/probes.
Reuse MutationReceiptStore and its existing table, DurableMutation, account-stamp/
impersonator checks and tracked SaveChanges audit path. No new persistent field/table,
revision token, repository/service/DTO, migration or country-specific fork is needed.
Holiday has no edit endpoint; serializing deletes does not require an edit version.

POST/DELETE holidays require Idempotency-Key. Capture normalized immutable create
fields and delete target before awaiting. Receipt ownership remains tenant/actor/role/
action/key; changed fingerprints are rejected. Authorize after receipt-lock waits and
before replay, then again after mutation database waits. Empty platform school scope
is denied; preserve the existing school impersonation workflow and role restrictions.
Create returns its original DTO, delete its empty success response, including replay
when the row has already gone. There is no new business uniqueness rule against
legitimate separately requested holidays with the same name/date.

Tracked FOR UPDATE deletion preserves existing AuditInterceptor behavior. A direct
ExecuteDelete draft was discarded before committing because it bypassed auditing.
Different delete intents serialize: one success, one localized not-found; same-intent
requests replay success. Holiday/receipt/audit effects share one transaction and roll
back together on receipt failure or access revocation. No copied manual audit writer.
Domain/receipt guidance explicitly refers to holidays/calendar in all three locales;
existing unrelated payment wording was not carried into this controller.

SPA Core reuses accountRequestConfig and captures credentials synchronously at API
invocation. The screen reuses useMutationIntent, AppFormSubmitButton and shared account
identity. Same operation keeps ID and form/confirmation state through explicit retries;
a deliberately new operation gets a new ID. In-flight duplicate callbacks and closing
an active operation are guarded. No automatic replay or mutation cancellation that
pretends an unknown outcome is failure. Hide old-account operations immediately and
ignore late success/error/refresh after scope change/unmount. Only confirmed success
triggers existing AppTable reloadKey; refresh failure cannot redefine a committed write.

Focused actual JWT/HTTP/PostgreSQL test passes (/tmp/dm-holiday-intents-focused.log):
eight concurrent duplicate creates and eight duplicate deletes across independent hosts,
changed create payload/delete target rejection, role/foreign-school denial, three-locale
missing-key responses, normal validator rejection, competing different delete intents,
receipt-failure rollback of create/delete and audit records, revocation while waiting
for a receipt lock and a Holiday row lock, and new-host/private-persisted-key-ring
replay after deletion. Existing ScopeHost, GradeWriteProbe and InventoryWriteProbe are
reused; the latter adds only an optional observed table (default InventoryItem).
The test host explicitly includes AuditInterceptor. Earlier test drafts without that
interceptor and the direct-delete implementation are superseded by final evidence.

Final full Core: 468 passed, zero skipped (/tmp/dm-holiday-intents-full-core.log).
Core commit 4f3a53e, SPA Core 9c18a76, API compatibility docs 110dd2c. Client callback/
intent/API-config tests pass (/tmp/dm-holiday-intents-client.log): pinned token, same-ID
explicit retry, fresh new-operation ID, pending duplicate/close guards, visible errors,
delete retry and no old-account reload on late success. Actual screen and real shared
intents/API config are exercised with controlled transport and simplified form/table
rendering; backend authority/persistence and the shared form/table/PDF behavior have
their own tests. This is not a new browser-layout or abrupt-process-loss benchmark.
Core TypeScript passes; installed consumer/package/country results follow below.

Final backend clean/build/pack/install/API build passes
(/tmp/dm-holiday-intents-sync-dotnet.log), as does SPA package build/pack/install
(/tmp/dm-holiday-intents-sync-spa.log). Installed shell TypeScript passes
(/tmp/dm-holiday-intents-shell-types.log). React skill checklist review retained shared
Core components/read lifecycle, stable intent refs, primitive account-scope effects,
functional reload state and existing accessible modal/submit controls; no new UI
library, caching layer or automatic mutation retry. Locale/enum/reuse/worker-health/
abstraction-isolation and API route gates pass.

Installed Afghanistan compatibility: 106 passed, zero skipped
(/tmp/dm-holiday-intents-country.log). Producer/API installed SHA256 match:
Core 57b351ef7eb6d9394ed42e64bf2deb95068645d2bc229f1ecbe356aa218bcc0a,
Abstractions 57c0e51419b4cfccb30c685a80f30e54e54fa0cce1d1fb4e41abfcdcb7a006aa,
country 9c192e29d35568d857885a9ec99fbca939c83cb345ae10f01109b4c56f7f73cd.
SPA consumer commits: AF 236ffce, AT 32c8856, shell e359c317. Backend-country source
stays unchanged; country behavior reuses the shared fix. No live database, developer
Redis, user-server restart, new dependency/persistence schema or push.

This closes holiday create/delete intent/audit handling, not the seven broader
completion requirements. Other legacy mutation/editor/invariant/read/output/job
paths still need their audits; SchoolEvent create/update/delete are an identified
next calendar workflow. Inventory's existing generic receipt guidance also still
references payments (observed while checking donor resources); inspect/correct its
own localized wording rather than copying that error into additional controllers.
Allocation profiling, longer representative deployment load and recovery/restore
proof remain. No cross-process kill or whole-goal completion is inferred from this
independent-host scenario. All original requirements remain open.

### Scoped school-event/RSVP read paths (eighty-second increment, 2026-10-29)

Discovery traced event/RSVP entities, repository/DTO/controller/validators, audit and
notification readers, actual list/upcoming/roster/editor callers, shared paginator,
AppTable/read lifecycle/export and enum normalization. Existing notification audience
is active delivery preference resolution, not historical roster names; audit resolver
uses actor precedence without stored RSVP role. Extend the existing event repository
with a role-specific scalar roster projection rather than copying either resolver or
introducing a service/table. No new persistent field or index is required here.

Fix the list's discarded filters and duplicate mount request. School/date/title
criteria combine before paging; sort title/start/end/location through a whitelist with
stable ID ties. List/upcoming repository reads use no tracking, cancellation, no-store
and direct-call bounds (upcoming max 100). UserResolver audit labels prime in bounded
batches before mapping; RSVP hydration is school-scoped and cancelled with the request.
The existing UTC-day upcoming cutoff and write behavior remain explicit, unchanged.

Roster endpoint now returns normal paged arrays/Pagination header (10 default/50 max),
creation-date and participant-name criteria. Project existing SchoolEventRsvp.CreationDate
into its DTO; RespondedAt remains last response, not entry time. No database column is
added. Role-specific scalar joins require the selected school, retain inactive local
history and support teacher/principal/head-master/staff families. Missing/foreign soft
references retain raw IDs; foreign names/credentials are never exposed. Remove the old
unbounded roster/dictionary materialization. The actual SQL probe caught whole-entity
count joins in an early draft; final ID/name-only projections and simpler counts pass
checks excluding PasswordHash and tracked entities.

Extend PagedList through a new overload accepting an equivalent scoped count callback;
keep the existing five-argument signature/ABI. No duplicated page clamp/offset logic.
Unfiltered roster counts the already-filtered RSVP source without display joins; name
searches retain those joins in the count. Cancellation checks before/after count also
cover empty results and a supplied count callback. This is a transient query contract,
not a stored count or second source of truth; count/display criteria must stay equal.

UI list/roster load through actual AppTable paging/filter/cancel/export paths. Empty
rosters keep filters and may export all matching pages. Preserve RSVP status under a
view alias instead of overwriting it with Base.status; shared enum normalization handles
named RSVP status while preserving event booleans. Role/status PDF values are readable
translated text. Roster modals hide across account scope. Upcoming reuses the shared
read hook and scopes optimistic rows/pending/error state to its source snapshot, pins
RSVP credentials and ignores stale/unmounted completions. Pending duplicate callbacks
are guarded; no automatic mutation replay or new server write semantics.

Inventory's existing receipt error strings incorrectly mentioned payment history.
Correct its own existing resource values in English/Dari/Pashto to inventory/item
history without adding another localization key or generic message store.

Focused PostgreSQL/HTTP/resource tests pass (/tmp/dm-event-reads-focused.log). Final
full Core: 471 passed, zero skipped (/tmp/dm-event-reads-full-core.log), including empty
count cancellation. Tests cover combined filters/stable pages, actual creation versus
response dates, historical inactive names, foreign-name exclusion, scalar SQL/no
credentials/no tracking, bounds/cancellation, real no-store/Pagination responses and
RSVP aggregates/caller state. Inventory resource tests verify all three locales and no
payment guidance. This is not representative large-roster plan/capacity evidence.

Client screen/API/read-scope/normalization tests pass (/tmp/dm-event-reads-client.log):
criteria/signal/no-store forwarding, no duplicate list mount fetch, paged roster adapter,
translated enum export values, preserved creation date/boolean status and account-hidden
rosters; upcoming ignores late account completion and unmounted RSVP results. Core's
existing table/export tests cover their separate layers; controlled transport tests
are not presented as a single real database-to-PDF benchmark.

Core b29e107, SPA Core a73dd81, API docs 894c56d. Normal package/consumer evidence follows
below. Backend country source and persistence schema remain unchanged. Event create/
edit/delete versions/receipts, server RSVP insert/update races, representative roster
plans, school-local cutoff semantics, remaining app audits and longer deployment load/
recovery/restore work remain. All seven original broader requirements stay open.

Normal backend clean/build/pack/install/API build passes
(/tmp/dm-event-reads-sync-dotnet.log), including Abstractions and SDK/country consumers.
SPA build/pack/install passes (/tmp/dm-event-reads-sync-spa.log). Installed shell
TypeScript passes (/tmp/dm-event-reads-shell-types.log). Client regressions pass again
after loading-state wiring: upcoming uses the shared table's isLoading state instead
of presenting its own empty message during a pending read. React checklist review
retained shared primitives, stable snapshot/ref fences, functional optimistic updates
and complete memo dependencies; no new UI library or read cache.

Installed Afghanistan integration: 106 passed, zero skipped
(/tmp/dm-event-reads-country.log). Producer/API installed SHA256 match:
Core a52628c156ce7fa168ea23c9c335c248ac53d1738ad39d3768bfa427be1fc96a,
Abstractions 9c25f320516c23e5ea3d2c0a3f3ceea12c9ddeba0ff8670a19e2b53bea4a99ed,
country ae43abfdd68108503da7645b1684b2e2960626e1c8860da534de65e49b254830.
SPA consumer commits AF 3a520c3, AT 488b857, shell fa5ad8ad. Backend country source is
unchanged. Locale/reuse/enum/worker-health/abstraction-isolation/API route gates pass.
No live database, developer Redis, user-server restart, new dependency, persistence
migration or push. Backend restart is still needed to load swapped assemblies; user
servers were deliberately left under user control.

All original seven requirements remain open. Next major workflow: school-event write
versions/receipts/authorization after waits and concurrent first-RSVP upserts; editor
hydration should also join the same cancellable/no-store scope. Further representative
roster query plans, UTC-versus-school-local day semantics, other app audits, allocation
profiling and longer deployment load/recovery/restore evidence remain. Read-path proof
does not establish event mutation concurrency or overall goal completion.

## Resume increment 83 — atomic RSVP preferences and explicit retry intents (2026-10-29)

Discovery traced the existing SchoolEvent/SchoolEventRsvp entities, EventId/UserId
unique key/FK, SetRsvpDto/validator, tracked audit interceptor, staff endpoint capability
mapping, account stamps/impersonation, encrypted MutationReceiptStore, shared
useMutationIntent/accountRequestConfig/read-scope hook and actual upcoming-events
caller. Reuse these in Core/SPA Core; no new persistent field/table/migration,
production service, UI component or country fork. Holiday tests' existing host setup
was extracted for RSVP reuse; the existing inventory probe gained only an optional
lock-clause selector, preserving its defaults.

Self-RSVP requires Idempotency-Key and retains {status}. A receipt transaction locks
the own-school parent FOR KEY SHARE, then serializes the existing event/user identity
with a namespaced advisory lock. Distinct deliberate intents are latest-committed-wins;
the existing unique key remains authoritative. Parent deletion cannot race an insert
into an FK error. Tracked saves retain audit behavior. Current account/impersonator
checks run after receipt waits, after domain waits and after saves. Existing staff
policy remains events.write; other active school roles retain self-service. Empty
platform scope cannot write. Row/audit/receipt roll back together on failure.

Replay returns the immutable original result without rewriting later responses or
advancing audit/timestamps. It may acknowledge an event subsequently deleted; it is
not a claim that the event or original response is still current. Browser intents keep
IDs across explicit retries of the same event/status/account, reset for deliberate new
choices or confirmation, pin credentials and block duplicate pending writes across
token/read refresh. Old-account/unmounted completions are ignored. Successful replies
invalidate the shared canonical read instead of computing optimistic counts. No
automatic mutation replay, second source of truth or device wall-clock ordering claim.

Focused actual JWT/HTTP/PostgreSQL scenarios pass (2 tests including holiday regression,
/tmp/dm-rsvp-focused.log). RSVP coverage: eight concurrent same-intent requests across
independent hosts; twelve distinct-intent first writes for another participant; one
row and expected audit count; later response preserved through original replay;
changed target/status rejection; three locales for missing keys and validation;
foreign school/target denial; receipt-failure rollback/recovery; authority revocation
while waiting for the parent and receipt locks; parent deletion winning the race;
fresh provider/key-ring replay. These hosts run inside one test process; this does
not replace abrupt process-loss/deployment load evidence. Audits lacking a direct
entity SchoolId retain their existing scope behavior, a separate broader audit.

Full Core suite: 472 passed, zero skipped (/tmp/dm-rsvp-full-core.log).
Client actual screen/intent/API/read-hook tests pass (/tmp/dm-rsvp-client.log), including
stable retry IDs, deliberate new-choice IDs, pinned tokens, no automatic retry, pending
write fence through token renewal/read refresh, canonical counts after replay and
old-account/unmounted completion. Existing AppTable stubs in these targeted tests are
not represented as real browser-to-database export evidence. Core/shell TypeScript
passes (/tmp/dm-rsvp-spa-core-types.log, /tmp/dm-rsvp-shell-types.log). React review
retains shared primitives, stable intent/ref ownership, complete callback dependencies,
logical identity fences and an accessible pending status. No new dependency/library.

Producer commits: Core a031839, SPA Core 6dd3c64; API rollout docs 763e04c.
Standard backend clean/build/pack/install/API build passes (/tmp/dm-rsvp-sync-dotnet.log).
SPA package build/pack/install passes (/tmp/dm-rsvp-sync-spa.log). Installed Afghanistan
integration: 106 passed, zero skipped (/tmp/dm-rsvp-country.log). Producer/API SHA256
pairs match: Core ea09cc531bf02529f8bc06e54d86e5696bec2f30b2d15b95ec406a779f0e8d82;
Abstractions 02a21b85266a8377245ae6f15581e5904cc2d03ea29152260428fa0fc09061ba;
country a57032ec5785084e7d651c1c087f9a81cf3c24bd57a70487691e55747945946a.
Consumer locks: SPA AF 047d564, AT be81a1b. Backend country source unchanged.
No live DB/developer Redis mutation, user-server stop/restart, persistence migration
or push. Core/SPA/shell rollout is coordinated; old keyless writes return 428. Users
still control when their servers restart to load rebuilt packages.

All seven original broader requirements remain open. Next: admin event create/edit/
delete versions and receipts, cancellable/no-store editor hydration and read recovery;
then representative large-roster plans, school-local day semantics, remaining app
mutation/query audits, classroom allocation profiling and longer mixed-school load/
deployment recovery/restore evidence. This increment closes the audited self-RSVP
race/retry path only; it does not establish overall goal completion.

Final shell source/lock commit: dacec11e. Locale coverage, shared-control reuse,
raw-alert/textarea/select guards, enum parity, abstraction isolation, background worker
health opt-in and API throttle-route checks pass through normal commit gates.

## Resume increment 84 — versioned event administration and retained drafts (2026-10-29)

Previous increment classification: progress (committed/verified durable RSVP path).
Discovery traced SchoolEvent/Base timestamps, existing IRevisionedRecord/DataContext
advancement/EF token, RecordVersions, DTO/mapper/validator, repository callers, receipt
store, access mappings, API hooks and actual editor/delete UI, shared forms/conflict
comparison/read lifecycle and calendar clock helpers. Nullable audit dates cannot serve
as expected versions; SchoolEvent had no version. Extend that same Core record with the
standard Revision, not a parallel event model or country version. EventEditRevision
backfills existing rows before nonnull enforcement. No new receipt table/service/UI
component or country persistence specialization. Existing legacy repository methods
remain for package compatibility; shipped admin HTTP writes now use guarded paths.
This is not a claim that unknown external/uncoordinated writers follow the protocol.

Admin POST/PUT/DELETE require Idempotency-Key; PUT includes Revision, DELETE uses its
revision query. All reuse encrypted actor/role/school/operation receipts and current
account/impersonator authorization. Update/delete acquire the tenant-scoped parent
FOR UPDATE, reauthorize, check shared versions and save tracked changes/audits. Explicit
no-op edits advance the version. Distinct stale edits/deletes fail with localized 409;
missing versions/keys return 428. Same-intent replay acknowledges its immutable original
outcome even after a later edit/deletion, without restoring or overwriting rows. Delete
preserves 204. Receipt failure rolls back create/update/delete/audits. RSVP changes do
not advance the event edit token. No automatic mutation retries or device-time ordering.

GET editor hydration is own-school, untracked, cancellable and no-store, with bounded
audit name priming and current RSVP state. Event instants require an offset and normalize
UTC before fingerprinting/persistence; unspecified date-times now return localized
validation, rather than Npgsql errors. Civil birth-date conversion remains separate.
No school-local cutoff policy is claimed here.

SPA API/hooks forward required keys/versions and pin credentials. Hydration is accepted
once per logical editor: token/culture background reads cannot unmount/reset an unsaved
draft. Shared form controls, submit state and conflict review retain entered values;
explicitly use the saved revision before retrying a stale edit. Enter cannot bypass an
unresolved conflict. Unknown outcomes retain intent IDs on unchanged explicit retries;
starting another operation is an explicit choice after checking possibly committed work.
No delayed navigation timer can affect another account. Extend calendarMonth's existing
localDateKey with localDateTimeKey for shared clock controls; UTC string trimming is not
local display. Untouched time input preserves original seconds/offset (including
ambiguous local clocks) rather than shifting an instant during a title edit.

Deletion uses the selected row version, Core modal and shared controlled conflict
comparison. A changed row cannot be silently reloaded/deleted; explicitly replace the
selection then confirm again under a new intent. Pending deletion cannot close and
retries retain IDs. Success alone reloads AppTable; old-account/unmounted completions
are ignored. Upcoming events add manual scoped read refresh. Read recovery never
replays RSVP mutations and retains the last snapshot on transient read overload.

Full isolated Core suite: 474 passed, zero skipped (/tmp/dm-event-writes-full-core.log).
Focused events/RSVP/holiday/migration scenarios passed (/tmp/dm-event-writes-focused.log);
final full suite additionally includes event-create receipt-failure rollback. Real
JWT/HTTP/PG tests cover duplicate creates/deletes across hosts, same-version competing
edits, stale/missing versions, foreign-school/non-admin denial, audit counts, three-locale
timezone validation, atomic create/update/delete rollback/recovery, row-wait authority
revocation and fresh-provider replay after deletion. Migration Up/Down executes against
legacy rows plus an RSVP FK table inside an owned rollback schema, preserving rows and
relationships, enforcing nonnull versions and checking distinct nonempty backfilled
tokens. No live schema mutation or
abrupt process-loss claim.

Client regressions pass in Asia/Kabul and America/New_York
(/tmp/dm-event-writes-client-kabul.log, /tmp/dm-event-writes-client-new-york.log).
They exercise actual Core forms/conflict comparison, route navigation, hooks and API
serialization with controlled transport; table/picker widgets remain their separate
verification layers. Coverage includes retained drafts across token/background hydration,
old account/unmount isolation, initial read retry/abort, exact untouched instants, stable
retry IDs, explicit new-intent reset, stale-version review/replacement, delete comparison
and canonical RSVP/read recovery. This is not a new end-to-end DB-to-browser timezone or
capacity benchmark. React review kept shared primitives, ref-owned pending guards,
complete callback dependencies and explicit replacement instead of effect-driven draft
resets. No new runtime dependency.

Core producer 570a22f; SPA Core d28d425; API rollout docs d376142. Standard SPA
build/pack/install passes (/tmp/dm-event-writes-sync-spa.log). Initial consumer checks
caught an unsupported button variant and a country fixture's legacy shared event DDL
missing the new Core migration; neither was ignored. The button now uses Core's supported
unstyled variant plus existing danger class. Country test/README commit b8ec9d6 composes
the actual Core EventEditRevision over legacy fixture DDL, rather than copying its column
into country migrations. The normal backend clean/build/pack/install/API build was rerun
after that producer commit (/tmp/dm-event-writes-sync-dotnet-final.log). No Core producer
source changed after packing. Earlier failing consumer log is superseded by final
installed-country run: 106 passed, zero skipped (/tmp/dm-event-writes-country-final.log).
SPA Core and installed shell TypeScript checks pass (and final shell commit gate checks it
again). SPA AF source/translation+lock commit 9954b53; AT lock commit 2e0bd72.

Final producer/API SHA256 pairs match:
Core 0f9483d5cc02b9f51330f88a68ab149108e0557d9a06f035e61da36abdf0696a;
Abstractions bc59f869bc1440972826977d642174610b09b8fff901d97f1afcfb28470aa1f8;
country c84de5d0ca4479c7d8e537bba78318a6ea75f1adfb0d27a50c43b8641b9c83c2.
No live DB/developer Redis change, user-server restart/stop, new dependency or push.
Deployment must apply EventEditRevision and ship Core/SPA/country translations/shell
together; old keyless/versionless writes fail closed. User controls API/SPA restarts.

All seven original broader requirements remain open. The audited shipped event admin
and self-RSVP paths are now guarded; this does not establish every editor/write/query
or overall goal completion. Next inspect announcement writes/notification delivery and
remaining editor coverage, then continue representative large-roster query plans,
dense calendar payload budgets, school-local day semantics, other module mutation/query
audits, classroom allocation profiling and longer mixed-school deployment load/recovery/
restore evidence. Preserve the original scope and do not convert these workflow tests
into a supported-user-count claim.

Final shell source/lock commit e5487aed. Its installed-contract tsc and locale coverage
checks pass, along with shared-control reuse and raw-alert/textarea/select guards.
All affected producer/consumer changes are local commits; no push.

## Resume increment 85 — atomic announcement inbox fan-out and bounded publication (2026-10-29)

Previous turn classification: progress (versioned event administration committed and
verified). Discovery followed actual announcement controller/repository/DTO/mapper/
validator, Notification and mutation/read receipt models, StageMany/PublishPersisted/
NotifyMany, account/audience/preferences/access mappings, delivery/capacity budgets,
existing indexes, current-year provider composition and shipped SPA composer/hooks.
No duplicate announcement/inbox/outbox table, delivery ledger or persistent field.
Extend existing SchoolNotificationAudience with a queryable target source and existing
INotificationService with async-stream publication under its aggregate deadline; an
individual-publish method cannot bound an entire lazy DB-backed fan-out. Compatibility
default preserves module service implementations; Core supplies the bounded override.

POST announcement requires Idempotency-Key and reuses the shared receipt transaction.
Canonical payload is fingerprinted before publish-now is computed. Own-school actor/
impersonator/staff announcements.create checks run after receipt waits and staging.
CLASS locks the active own-school/selected-year Class FOR SHARE through commit and
rechecks authority. Existing announcement/audit, all preference-filtered inbox rows and
receipt commit/rollback together, including failure after earlier batches were saved.
Targets and staged notices are keyset-paged in 250-row batches; detach only completed
notices, retain unrelated state and never accumulate every account/notice. Shared
ExpensiveOperation, request-size and cancellation paths bound the HTTP work. Different
explicit intents may legitimately create different announcements; no business uniqueness
on title/body is imposed and no automatic replay is introduced.

Targets reuse active account/enrollment/parent/homeroom/teacher-role relationships.
ALL includes granted operators, actual teacher-family roles and active school members;
foreign/inactive/ungranted/muted accounts are excluded. Matching parents get one CLASS
notice even with several children. Announcement staff grants are rechecked at staging/
publication, not cached from initial target selection. Teacher-family feed and homeroom
scope now reflect actual role and selected school/year/status. This is per-batch current
membership, not a whole-school point-in-time snapshot; account/role changes across pages,
course-teacher class visibility and year-selection changes through commit remain open.

After commit stream existing own-school/type/related/id inbox rows in 250-row pages
under the shared aggregate publication deadline, including enumeration/DB work. Live
failure cannot turn committed creation into a failed HTTP result; replay never
republishes. Inbox persistence is authoritative, external delivery remains best effort.
No exactly-once broker, durable push retry or scheduled future-delivery worker is
claimed. Future/expired messages have no immediate fan-out. Other NotifyMany/StageMany
callers still require their own bounds/transaction audit; this new overload does not
magically bound every producer.

NotificationRelatedFanout adds only a shared partial school/type/related/id index using
the existing validated concurrent-index migration helper. Existing recipient/retention
indexes cannot seek this related-entity publication independently of recipient. Model
and snapshot agree. In a private synthetic 50,000-row fixture (1,000 related target rows),
EXPLAIN used scan/sort before, the named index after: warm local execution 2.414ms/
1163 shared hits versus 0.054ms/247 hits. Detailed proof:
/tmp/dm-announcement-create-index-plan.log. Tests also cover Up replay retaining OID,
wrong-definition fail-closed behavior and Down preserving all rows. This is a synthetic
query improvement, not production capacity/SLA or a complete representative-data audit.
Interrupted invalid builds require operator inspection, not automatic destructive repair.

Editor hydration is scoped, untracked, cancellable/no-store and primes bounded audit
labels. Instants require offsets, normalize UTC and preserve original seconds/offset
when local input is unchanged. SPA create wrappers require stable intents and pin
credentials; the existing composer is keyed by logical account/record, hydrates once,
retains drafts through token/language refresh, gates duplicate pending callbacks and
ignores stale account/unmounted completion. Explicit unchanged retry keeps its ID;
a new operation is a separate explicit action after checking potentially saved work.
Success navigates immediately rather than via a timer that can affect a later account.
Core controls and their disabled contracts are reused; no copied UI primitives or
country behavior fork. Server update/delete versions and receipt races/privacy remain
open, despite safer editor read/draft handling.

Final full isolated Core suite: 476 passed, zero skipped
(/tmp/dm-announcement-create-full-core.log). Earlier broad-run fixture-year failure
was not ignored: the class test initially picked another fixture's globally active year.
It now uses the actual school-year provider composition with a finite-selection option
on the existing cancellable provider fixture, without mutating anybody else's global
active flags. Core production year validation was retained. Focused tests and detailed
index test pass (/tmp/dm-announcement-create-focused.log,
/tmp/dm-announcement-create-index-plan.log); the final full suite contains that fixture
correction.

Actual JWT/HTTP/PG proof includes eight concurrent same-intent requests; 1,005 valid
recipients/five batches with <=250 tracked notices; no credential projections; bounded
target/inbox SQL; parent deduplication; preferences/foreign/inactive/ungranted exclusion;
actual principal-role delivery/feed; mid-batch and receipt-failure rollback; explicit
recovery; class archive winning the lock race; and authority revocation while replay
waits. An independent connection observes domain/receipt commit before injected live
failure; creation still succeeds and replay never republishes. Existing delivery tests
exercise async-enumeration deadline, caller cancellation and iterator disposal. These
are independent test hosts in one process, not a new abrupt process-loss/load proof.

Client regressions pass in Asia/Kabul and America/New_York
(/tmp/dm-announcement-create-client-kabul.log,
/tmp/dm-announcement-create-client-new-york.log). Actual composer/Core inputs/hooks/API
configuration with controlled transport verify duplicate gating, stable retries across
token renewal, deliberate reset/new IDs, pinned tokens, draft retention, stale account/
unmount navigation isolation and exact untouched instants. Picker/class/enum widgets
remain their separate test layer; no real DB-to-browser timezone benchmark is claimed.
SPA Core and installed shell TypeScript pass. React checklist preserves shared controls,
logical resource ownership, complete read effects and no effect-driven draft resets.

Core producer ef7988a; SPA Core 568c40a; API rollout docs 8c02b75. Standard backend
clean/build/pack/install/API build passes (/tmp/dm-announcement-create-sync-dotnet.log),
as does SPA build/pack/install (/tmp/dm-announcement-create-sync-spa.log). No producer
source changed after packing. Installed Afghanistan suite: 106 passed, zero skipped
(/tmp/dm-announcement-create-country.log), including default-interface module service
compatibility. Final producer/API SHA256 pairs match:
Core 52086a086e640b4646d0a58d3bfea5a0b58cb9264daaa807b5a649cbdff10c9c;
Abstractions dd2f3448afcc9e0c870513f06531b871ff3be2e1bdaa504ca79deef8a7d6ced3;
country 7194a418d5fb210a0f0d8ce3940d684f3a9143b5ef3b1c002f14145ef6d0fa73.
SPA AF translations/lock f0f3061, AT lock 09a1986, shell source/lock 6330c8a3.
Locale/enum/shared-control/abstraction/worker-health/API route gates pass. No new
runtime dependency, live DB/developer Redis mutation, user-server stop/restart or push.
Deploy the index and Core/SPA/country/shell together; user controls server restarts.

All seven original broader requirements remain open. Next prioritize announcement
read-receipt eligibility and first-read races, bounded/privacy-scoped receipt rosters
and active/admin reads; then versioned announcement edit/delete and shared form conflict
review. Scheduled later delivery, broader audience semantics/producer audit, remaining
module mutation/query coverage, dense calendar payload budgets, school-local semantics,
classroom allocation profiling and longer mixed-school deployment load/recovery/restore
proof still remain. This closes the audited immediate announcement create/inbox path,
not the overall concurrency/performance objective.

## Resume increment 86 — announcement first-read identity and visibility (2026-10-30)

Previous turn was a status-only answer (no implementation progress); this turn rechecked
current source and continued the next audited defect. Discovery traced Announcement /
AnnouncementReceipt, EF model/snapshot/migrations, existing repository/controller/DTO,
actual banner/API/receipt-list callers, SchoolEvent RSVP locking, account/impersonator
stamps and staff endpoint grants. Existing receipt.ReadAt and announcement/user identity
represent first read; no second intent table/field/service or country specialization is
needed. Shared behavior belongs in Core's existing AnnouncementRepository.

The old model comment claimed a unique announcement/user index, but source actually has
only the announcement FK index. Do not repeat that claim or silently delete historical
duplicates. This increment serializes the audited writer with existing PostgreSQL
transaction/advisory-lock conventions, preserving all stored history. A future database
uniqueness migration needs an explicit duplicate strategy; that invariant remains open.

MarkRead retains its keyless POST and {readAt} response. It takes own-school announcement
FOR SHARE, then namespaced announcement/user advisory transaction lock (role excluded,
matching the existing row identity). Parent SHARE blocks ordinary audience/status/time
edits and deletion; KEY SHARE would not freeze mutable visibility. After waits, recheck
current account/impersonator/staff announcement grant and current school/year class scope.
The repository's active/audience predicate now serves both feed and first-read checks;
it excludes archived, future, expired, wrong-audience, foreign and platform/unknown scope.
Existing receipts confer no continuing access to hidden messages. Teacher class rules
remain existing homeroom membership; course-teacher expansion is separate discovery.

First insert uses tracked SaveChanges, existing audit interception, another authority
check and a single commit. Failed saves/authority roll back. Distinct hosts/retries return
the same persisted timestamp, including database precision; no repeat role/time update.
Historical duplicate rows return earliest ReadAt and feed hydration groups by announcement,
counts distinct user IDs and takes the caller's minimum timestamp, with explicit school
scope and cancellation. Existing feed ordering gains stable Id and no tracking. These
queries do not establish a snapshot of changing enrollment/membership relationships.

Isolated real-JWT/Kestrel/PostgreSQL regression reuses CalendarMutationHost and existing
failure/lock probes, own test school/year provider and private keyring. Twelve concurrent
POSTs across two hosts yield one receipt/identical timestamps. Eligibility tests cover
class enrollment withdrawal, audience/publication/expiry/archive/school denial including
existing receipts; shared feed exclusion; preserved duplicate history/distinct counts;
concurrent edit winning parent lock; authority revocation during pair wait; post-save
receipt/audit rollback; caller cancellation and explicit recovery. These are independent
hosts within one test process, not abrupt process-loss/load or browser-to-DB evidence.
Initial focused case passed (/tmp/dm-announcement-read-focused.log). Final full-suite and
installed-package evidence are recorded below after verification.

All seven broader requirements remain open. Next: bounded/private announcement receipt
rosters, active/admin read bounds and client account/banner lifecycle; versioned edit/
delete and shared form conflict review; missing database first-read uniqueness invariant
and explicit legacy-data strategy; scheduled notification delivery. Other remaining module
mutation/query coverage, dense payload budgets, allocation profiling and longer mixed-
school deployment load/recovery/restore proof are unchanged. No live DB/developer Redis,
user-server restart, push or new runtime dependency is part of this increment.

Final verification: Core 477 passed, zero skipped
(/tmp/dm-announcement-read-full-core.log). The first attempted full run stopped at a
new test's incorrect Audit property name (NewValues rather than existing After); fixed
the assertion to use the actual model, then completed the full run. No production audit
schema change was needed. Core source commit 290bb36, API rollout docs 5712ba0.
Standard clean/build/pack/install/API build passes
(/tmp/dm-announcement-read-sync-dotnet.log); producer source was not changed after packing.
Installed Afghanistan suite 106 passed, zero skipped
(/tmp/dm-announcement-read-country.log). Producer/API SHA256 pairs match:
Core 8d49d3779e5e9dab7e4136b16611de90b9307dfc5a6619e4da23023d8ef45f26;
Abstractions b308b4afe2ed9d2834eae40f0c8c152bcd05d70bd31d7b550bf303f87e89856f;
country adc25b265a6b53411b5e7ce16fba0d5deba46ccbb40bde6aaa2eb9a8f3ab2517.
Shared locale/enum/package/abstraction/worker-health/API-route commit gates pass. No SPA
source/contracts changed, so no frontend package swap or new UI validation is claimed.
Only owned isolated test hosts/databases were used; user servers were left untouched.
All seven original completion requirements remain open.

## Resume increment 87 — paged announcement history and shared participant labels (2026-10-30)

Previous turn made verified progress (increment 86, committed/rebuilt with 477 Core and
106 installed Afghanistan tests). This turn rechecked current source and traced the
announcement admin/receipt endpoints, raw receipt DTO/entity/model/snapshot, all SPA
API/hook/banner/list callers, GeneralParams/PagedList, actual AppTable filter/paging/
export behavior, event RSVP roster, audit UserResolver and notification identity queries.
Receipt Id and CreationDate already exist; no new persistent representation is needed.
Existing audit labels use identity precedence/platform scope; active notification targets
suppress inactive people. Neither represents role-specific historical names unchanged.

Extend existing Core UserResolver's scalar ActorLabel projection with internal participant
Role and ParticipantNames query, consumed by both existing event and announcement rosters.
It projects only IDs/roles/names for own-school student/teacher/parent/staff and owner,
retains inactive local history and normalizes teacher-family joins to TEACHER. Missing,
foreign/transferred or wrong-role identities fall back to raw IDs; no global user-name
lookup or copied role-table implementation. An initial object-null test on projected
labels did not translate in EF; use scalar Name coalescing, preserving server-side joins,
name filtering and paging. Existing event-roster regression passes against the shared query.

AnnouncementRepository now owns Roster over existing history: parent-school existence,
creation-date filters, trimmed case-insensitive name search, whitelisted role/name/read
sort and stable receipt Id paging (10/50), cancellation/no tracking. Counts omit display
joins when no name filter, otherwise count equivalent joined criteria through the shared
PagedList overload. Receipt DTO exposes existing Id/nullable CreationDate alongside ReadAt.
History includes retained legacy duplicate receipts, separately keyed, while feed ReadCount
remains distinct users. No uniqueness migration or duplicate-history deletion is claimed.

Admin pages now use no tracking, cancellation, stable/whitelisted global sort and the
existing combined title/creation filters. The old two-argument repository method remains
as a forwarding overload. Controller primes bounded audit labels before mapping; both
reads return no-store and Pagination. Empty/extreme pages retain proper metadata.

Core SPA API list/listReceipts accept paging/filter/signal, synchronously pin account
credentials and disable offline fallback. Shell replaces full-roster fetch/state and
failure-as-empty arrays with the real AppTable loader in the existing fixed-footer modal.
Use persisted receipt IDs and actual creation dates, including missing-date handling;
never substitute ReadAt for creation date. Account changes hide old modal selection.
All applied name/date/sort criteria reach each page/export call. Roles export translated
teacher-family/staff labels; announcement read-count export now emits its number instead
of its UUID. Shared controls/errors/empty-state/filter placement/print preferences remain
owned by Core; no new component/service/dependency, locale string or country rule.

Core full isolated suite: 478 passed, zero skipped
(/tmp/dm-announcement-roster-full-core.log), including actual PostgreSQL/JWT/HTTP roster
metadata, combined filters and second pages, role collision, transferred/foreign identity
privacy, inactive history, retained duplicates, actual creation/read distinction, stable
paging, cancellation, no credentials/tracking, and empty/extreme pages. The first focused
run exposed the EF object-null issue; the next had only a test's wrong header assumption
(totalCount instead of existing totalItems). Both were corrected using actual contracts,
then the full suite passed. These small behavior fixtures are not representative-data
EXPLAIN benchmarks or whole-application capacity evidence.

Real shell/Core hook/API/control tests pass in Asia/Kabul and America/New_York
(/tmp/dm-announcement-roster-client-kabul.log,
/tmp/dm-announcement-roster-client-new-york.log). Announcement table callbacks are captured
at this layer: verify no duplicate mount fetch, paging/filter/signal/token transport,
metadata/actual dates/IDs, translated exports, errors reaching AppTable and account-modal
isolation. Manual page-loader calls cover criteria propagation, not a real browser-to-DB
PDF claim. The unchanged actual AppTable PDF workflow regression also passes
(/tmp/dm-announcement-roster-pdf-workflow.log), including real all-page export/cancellation/
ready-viewer behavior. Shared SPA Core TypeScript passes before packaging. React review
keeps shared controls, correct memo dependencies and no effect-driven full-roster requests.

Core producer 836f757 and SPA Core 0bacc0e were committed before packing. Installed-package
verification and consumer commits are recorded below after completion. All seven original
completion requirements remain open. Next: bounded active feed and scoped client banner
lifecycle, versioned announcement edit/delete/conflict review, missing receipt uniqueness
invariant/legacy strategy, scheduled notification delivery, broader producer/audience and
module write/query audits, dense payload limits, allocation profiling and longer mixed-
school deployment load/recovery/restore evidence. No live DB/developer Redis mutation,
user-server restart or push is authorized by this isolated validation/package cycle.

Standard backend clean/build/pack/install/API build and SPA build/pack/install both pass
(/tmp/dm-announcement-roster-sync-dotnet.log,
/tmp/dm-announcement-roster-sync-spa.log). No producer source changed after packing.
Installed shell TypeScript passes (/tmp/dm-announcement-roster-shell-types.log).
Installed Afghanistan suite: 106 passed, zero skipped
(/tmp/dm-announcement-roster-country.log). Producer/API SHA256 pairs match:
Core 67722292663510d80110b3b6e7fcb847054f0855be4e2a1ae2d39aee19460a9f;
Abstractions 09ce9818cb81d32a3d1512433b27d372f250d91776e29205573803d382cf7639;
country fbba5460ac66eb7d3e4875d84164d0b0db7319e453c71adc1451eb93ff081027.
API docs 01d2115; AF SPA lock cba3771; AT lock 5ae7794; shell source/lock 6ae55733.
Commit gates passed, including shared controls, locales/enums/packages/abstractions,
worker-health and route checks. No country runtime source or mobile contract changed.

The broader existing export regression runner exposed a stale country-consistency test
that did not supply SchoolCalendar's real useReloadableRead export (introduced in the
previous calendar increment). Its old assertion also required aborting an already finished
request. Updated that test to use the actual shared hook and prove cancellation of a
controlled *pending* request on unmount, then resolve late work without rendering it.
No production hook/calendar change or test bypass was necessary. Focused country UI check
passes (/tmp/dm-announcement-roster-country-ui.log); the complete export audit is rerun
below. This is test coverage repair, not a new country-specific calendar implementation.

Final complete export/filter/form/module regression passes
(/tmp/dm-announcement-roster-pdf-audit.log): 104 AppTable sites inventoried, shared Unicode
PDF/settings in en-US/fa-AF/ps-AF, real all-page export workflow, country/module composition
and UTC-west date-only checks. Artifacts and latest.json:
/tmp/dm-announcement-roster-pdf-audit. These are source/JSDOM/PDF artifact checks, not a new
real-browser-to-live-DB/load benchmark. All owned test/build handles completed, no user
server was stopped/restarted and no live database/developer Redis was altered. All seven
original broader completion requirements remain open.

## Resume increment 88 — bounded active feed and scoped dashboard acknowledgements (2026-10-30)

Previous turn was verified progress: increment 87 committed, installed and tested (478
Core/106 Afghanistan plus 104-table UI/export audit). Rechecked current controller,
repository/interface/DTO/model, shared page/filter/audit/receipt helpers, actual banner,
hook/API/all dashboards, mobile scaffolds, account identity and staff endpoint policies.
Existing Announcement/receipt relationships and Core paging/read/control primitives
represent the feature; no persistent field/table/index/service or country rule is added.

The old unbounded ListActiveForRole and materialized ResolveClassIdsFor had only the
controller and known regression callers; none in SDK/country/mobile production paths.
Replace them with the repository's paged ListActiveForUser requiring actor/year/filters,
update actual regression callers, and remove the alternate unbounded contract instead of
retaining a full-history escape. Core/API/country binaries must ship together. Existing
ClassIdsFor logic remains IQueryable into shared active/audience visibility, including
MarkRead; no materialized membership list before count/page/first-read checks. Preserve
existing homeroom (not all course teachers) and school/year/status/enrollment/parent rules.
The shared ordering helper preserves admin default pinned/published ordering and feed
default pinned/priority/published, with stable Id ties and whitelisted explicit sort.

GET active now applies combined title/creation filters and uses GeneralParams/PagedList
10/50 bounds, cancellation/no tracking/Pagination/no-store, bounded audit priming and
existing distinct-reader/earliest-receipt hydration. Extreme/empty pages retain metadata.
This is a paged query, not a single database snapshot, fixed-byte payload limit or a
representative SQL-plan/index performance claim. Counts/joins still depend on school size.

Core API active/markRead pin credentials/no-store/signals. Existing banner body is factored
behind a logical account/page-size key (no new exported widget), reusing useReloadableRead,
AppPagination, AppButton/AppAlert and AppCalendarDate. Limit means rows per page, default
10/max50; older announcements remain reachable through server pages rather than silently
truncating history. Validate metadata/row bounds, hide old account/token/language snapshots,
retain same-scope transient-read data, clear authoritative read failures, cancel obsolete
pages and unmounts, allow explicit single-flight refresh and clamp a shrunken last page.
Staff without existing announcements.create and platform/anonymous users skip school feed
requests. Actual server account/grant/audience authorization remains authoritative.

Read acknowledgements retain the existing naturally idempotent first-read writer, without
new request keys or rows. At most one POST is active. Cancel obsolete queues, capture
credentials at request start and handle rejected/malformed/unknown outcomes without
unhandled promises. The existing banner owns at most 100 recent attempt entries; tracked
failed/unknown attempts do not resend on render/read refresh/token renewal, and visible
failures have explicit retry. This is bounded recent memory, not durable retry metadata:
a deliberately revisited page after cache eviction may naturally acknowledge again.
401/403 acknowledgements hide cards immediately until a successful fresh GET revalidates
access. No optimistic read-count updates or automatic transport retry.

English/Dari/Pashto action/status messages are added only to existing SPA/mobile locale
owners. Static mobile message banners do not call active and are not represented as an
API integration. Locale edits preserve unrelated formatting. No new runtime dependency
or module-specific calendar/permission implementation. React review keeps shared controls,
logical component ownership, explicit effect dependencies and bounded effect resources.

Focused existing announcement regressions: four passed; final full isolated Core suite:
479 passed, zero skipped (/tmp/dm-announcement-feed-full-core.log). New actual PostgreSQL/
JWT/HTTP scenario covers 80 notices, paged/date/title/sort combinations, metadata, parent/
student/teacher-family eligibility, old-year/archived classes, foreign/platform scope,
stable pages, no credentials/tracking, SQL membership with LIMIT, default page, extreme
bounds and cancellation. Updated prior tests retain the same eligibility assertions
through the new paged contract. No whole-app load or abrupt process-loss proof is claimed.

Real banner/Core controls/hooks/API with controlled transport pass in Asia/Kabul and
America/New_York (/tmp/dm-announcement-feed-client-kabul.log,
/tmp/dm-announcement-feed-client-new-york.log): account-switch stale suppression, pending
read cancellation/single flight, paging, sequential POSTs, failed intent retained across
render/refresh/token renewal, explicit retry, old-page queue cancellation, authoritative
ack/read denial, successful revalidation, transient snapshot retention, unmounts, oversize
responses, and staff grant gating. These are JSDOM/source tests, not real browser-to-DB
or exact external delivery evidence. SPA Core/installed shell TypeScript and mobile locale
coverage pass. Installed Afghanistan suite:106 passed, zero skipped
(/tmp/dm-announcement-feed-country.log).

Core source 7b7aeef, SPA Core 35fe5c7 and mobile country 6645813 were committed before their
standard packing. Backend clean/build/pack/API install/build, SPA and mobile package
build/pack/install pass (/tmp/dm-announcement-feed-sync-{dotnet,spa,mobile}.log). No producer
source changed after packing. Both mobile apps' six installed language bundles byte-match
country source. Producer/API assembly SHA256 pairs match:
Core af2ee9156ca63a88880cf7b69a732f107d2f43d20cef021a2b637a34f2dd8ae8;
Abstractions 16bb7124da2fb9fc33ef536ccb0ab63d37172a6ed71579ca6486f4726789748d;
country 36aa422d281633932f9657ce93b43f32c79a00777ca09b48e5566a4b27f43de0.
Final consumer commits/full UI audit are recorded below. User API/SPA/Metro, live DB and
developer Redis were not stopped/restarted/mutated; nothing pushed.

All seven original broader requirements remain open. Next prioritize versioned announcement
edit/delete and shared conflict-preserving forms, database receipt uniqueness/legacy strategy,
scheduled delivery and wider audience/producer coverage. Representative remaining query/index
plans, dense payload budgets, other module write/query/invariant audits, classroom allocation
profiling, telemetry/deployment setup and longer mixed-school load/recovery/restore evidence
still require their own completion proof. Do not infer completion from this bounded feed.

Final installed/consumer verification: full export/filter/form/module audit passes
(/tmp/dm-announcement-feed-pdf-audit.log), 104 AppTable sites and shared Unicode/settings
in all three languages, with current real banner regression included. Artifacts:
/tmp/dm-announcement-feed-pdf-audit. Consumer commits: API 5746ef2; AF SPA translations/lock
40314f4; AT lock 3fd81dc; shell lock 9750ea44; mobile parent lock 7c3d253; mobile student
lock 8dbc242. Source/package/locale/enum/route/shared-control/abstraction/worker-health
commit gates pass. All owned test/build handles are terminal; no user API/SPA/Metro stop,
live DB/developer Redis mutation or push. All seven original completion requirements
remain open, and no supported production user count or deployment-readiness claim is made.

## Resume increment 89 — versioned announcement corrections and retained-history archival (2026-10-30)

Previous turn made verified progress: increment88 committed/installed, 479 Core/106 AF
plus full UI/export audit. Current discovery traced Announcement/Base/audit/status and
receipt FK/model/migrations, DTO/mapper/repository/all callers, existing event versions/
receipts/migration tests, shared Core form/read/editor/checkbox/deletion primitives,
country profile consumers and both mobile scaffolds. No equivalent expected-version
field exists on Announcement; nullable UpdateDate cannot represent Core's opaque token.
Extend that existing Core entity through IRevisionedRecord rather than a parallel table,
country version or adding fields to every Base entity.

Announcement.Revision uses the existing DataContext advancement/EF concurrency mechanism,
DTO output/expected input, ignored client-to-entity mapper property and narrow
20261030100000_AnnouncementEditRevision migration: nullable add, nonzero random backfill,
non-null requirement. Snapshot change is limited to this property. Both event/announcement
migration tests reuse one owned-schema verifier, preserving 30 old rows and child references
through Up/Down and proving inserts cannot omit the token. No live migration was run.

PUT/DELETE reuse DurableMutation/MutationReceiptStore, current stamp/impersonator/staff
authorization, own-school active-parent FOR UPDATE, RecordVersions.Check, tracked audit
saves and atomic receipt commit. Require Idempotency-Key; PUT echoes Revision, DELETE
uses revision query and retains204. Expected versions participate in command fingerprint;
replays after later edits/archival return immutable original responses, never restoring
old state or swapping in current versions. No-op corrections advance the token. Preserve
author/school and omitted publish instants; normalize provided instants UTC. New class
bindings reuse Create's active own-school/request-year FOR SHARE check; unchanged historical
bindings stay editable without forced reassignment. No update notification fan-out.

The initial focused mutation test exposed the actual global RESTRICT receipt FK: physical
announcement deletion was already failing with receipt history. Preserve that invariant
and history by archiving existing Status=false, not FK weakening/cascade or copied archive
state. Version/status/audit/receipt commit together. Admin/get/roster/active normal readers
exclude archived announcements; receipts remain attached, and tracked UPDATE audit describes
the actual archive. Failure rolls status/token/audit/receipt changes back. Remove unused
unguarded repository Create/Get/Update/Delete methods after all callers moved, rather than
leave an alternate non-versioned writer. Coordinate Core/API/country binaries and old-writer
drain; no safe mixed unversioned update deployment is claimed.

Editor uses existing useVersionedRecordEditor with shared Formik/option/class/date fields,
local validation, request intent and explicit AppRecordConflictReview. Extend that hook's
existing lifecycle with loading/saving/error-clear presentation instead of another editor
state machine. Retain drafts/versions/IDs across failures/token/locale renewal; abort/fence
old account/resource work; explicit saved replacement resets baseline/instant metadata and
intent; preserve unchanged seconds/offsets. Read/edit acceptance requires nonzero versions.
Only create accepts a valid returned ID without a new revision, because older encrypted
create replies predate this schema: navigate to canonical list, do not invent/merge a current
version. Client test covers the legacy-shaped create reply and malformed unversioned edit
reply; this is not a new end-to-end old-keyring encrypted migration experiment.

AppFormInput has no controlled boolean checked binding, while AppFormCheckboxGroup models
arrays. New Core AppFormCheckbox adapts existing AppCheckbox (blur/error/ARIA), not native
markup. New Core useRecordDeletion extracts the event page's existing confirmation state
and both event/announcement lists consume it: selected versions, stable uncertain intent
through same-version close/reopen, explicit stale comparison/replacement, pending guards,
account generations including A-B-A and unmounted result isolation. Missing versions fail
closed before transport; both API delete wrappers require actual204 before acknowledgement.
No copied domain-local confirmation reducer, new country primitive or runtime dependency.

All new validation/confirmation strings ship in English/Dari/Pashto in existing SPA/mobile
locale owners and controller-local backend resources. An old literal class-required message
is now localized; access-denied wording covers management, not just creation. Mobile receives
messages only; no scaffold-to-API feed integration is claimed.

Final full isolated Core suite:481 passed, zero skipped
(/tmp/dm-announcement-edit-full-core.log). Focused shared migration/write checks pass after
the FK discovery. Actual JWT/independent hosts/PostgreSQL verify same-version edit race,
missing keys/versions/foreign/teacher denial, class bindings/history, no-op token and stale
EF-writer protection, atomic failed receipt rollback, authority revoked during row wait,
eight same-intent archive requests with one audit, retained receipts, immutable replay after
archive/restart and hidden normal reads. These are multiple hosts in one test process,
not abrupt process-loss/load or deployment recovery evidence.

Real shell/Core forms/hooks/control tests pass in Asia/Kabul and America/New_York
(/tmp/dm-announcement-edit-client-{kabul,new-york}.log): validation, actual boolean state,
retained drafts/IDs, exact untouched instants, explicit conflict review/new baseline, malformed
update response rejection, uncertain creation recovery, versioned delete comparison/retry,
same-version close/reopen, A-B-A old-result isolation, missing-version and unexpected200
fail-closed handling, cancellation and no late navigation. Calendar/class lookup widgets
remain their separate controlled/tested layer. React review preserves shared primitives,
primitive ownership dependencies and no effect-driven duplicate hydration/writes.

Source Core types and preflight shell types pass; the temporary declaration check initially
could not resolve external dependencies and then mixed two Yup installations. Fixing only
the owned temporary resolution context resolved those harness errors; the installed shell
check below is authoritative. Full source UI/export/form/module audit passes with 104 table
sites and all three languages (/tmp/dm-announcement-edit-pdf-audit.log), including existing
country profile forms using the extended shared editor. Artifacts:
/tmp/dm-announcement-edit-pdf-audit. No real-browser-to-live-DB or supported-user-count claim.

Core producer 1cdfdaf; SPA Core 3f8f576; mobile country 75130ca. Standard backend clean/build/
pack/API install/build, SPA and mobile build/pack/install pass
(/tmp/dm-announcement-edit-sync-{dotnet,spa,mobile}.log). Producer source unchanged after
packing. Installed shell TypeScript passes (/tmp/dm-announcement-edit-shell-types.log).
Installed AF suite:106 passed, zero skipped (/tmp/dm-announcement-edit-country.log).
Six installed mobile language bundles byte-match source. Producer/API SHA256 pairs match:
Core b29decfc87049bd8bed60f66e079415c0d0fa3bd30ba803caf23c354b791b217;
Abstractions 2612a1038fb3e5a45cb7f0a0c7a8a6ca9dfb9e9d54fb73a20387fcd687506697;
country 873725ce40d606657ef6eb9d8118f6142b61defa87cc04453ae076fabd8b2554.
Final consumer commits recorded below. No live DB/developer Redis mutation, API/SPA/Metro
stop/restart, provider activation, external message or push was performed.

All seven original completion requirements remain open. Announcement receipt database
uniqueness/legacy duplicate strategy, scheduled notification delivery and wider audience/
producer semantics remain. Other record/module writes, query/index/invariant coverage,
dense payload bounds, classroom allocation profiling, telemetry/deployment configuration
and longer representative mixed-school load/recovery/restore proof remain separate work.
Do not infer completion of the broader objective from these announcement protections.

Final consumer commits: API fd89eb2; AF SPA translations/lock 95140fb; AT lock db88b6e;
shell source/lock a0e969b3; mobile parent lock 0b655cc; mobile student lock 6975831.
Shared control/locale/enum/package/abstraction/worker-health/route gates pass. All owned
verification/build handles are terminal and source worktrees are checked clean after
commits. Apply the prepared revision migration only through the normal coordinated API
rollout; the developer database and running servers remain untouched. All seven broader
requirements remain open.

## Resume increment 90 — native announcement receipt identity with retained history (2026-10-30)

The preceding user status turn was no implementation progress; this continuation
revalidated the dirty carryover and completed its missing migration/behavior tests.
Discovery traced AnnouncementReceipt's existing Id, AnnouncementId, UserId, UserRole,
ReadAt, Status and audit fields, EF configuration/snapshot, MarkRead transaction and
its callers, feed hydration, paged historical roster, and API/country writers. No
country/API receipt writer exists outside the Core path. The claimed unique identity
was previously enforced only by that writer's advisory lock. Reuse Status to mark
one current first-read row per existing announcement/user pair; no field, table,
service, DTO or alternate receipt store was added. Shared Core owns the invariant.
The existing test fixture now owns the lock observer previously copied between
retention suites; the existing calendar HTTP host is reused without another host.

AnnouncementReceiptIdentity is one ordinary transactional migration: acquire a receipt
table SHARE ROW EXCLUSIVE lock, rank by ReadAt then Id, set the earliest row current
and surplus rows inactive, add a NOT VALID CHECK(Status), and create native partial
unique UX_AnnouncementReceipt_Current(AnnouncementId,UserId) WHERE Status. Every
original identity/role/read/creation/audit value survives. Status previously did not
control acknowledgement, so an earliest formerly inactive receipt becomes current.
The NOT VALID check deliberately retains historical inactive rows while rejecting
future inactive inserts/updates; do not later validate it against retained duplicates.
This is not an online concurrent-index rollout: receipt writers wait during
normalization; subsequent DDL may require stronger locks. Drain/update old writers
and coordinate startup/migration before readiness. Down removes the guard/index,
retains history and does not invent the old arbitrary Status flags. Ordinary fresh
EnsureCreated schemas enforce the same check and partial unique key.

MarkRead now reads the single current row, and feed hydration counts current rows
and reads the caller's current timestamp. Historical rosters intentionally retain
all rows, IDs, role-specific scoped names and CreationDate. Existing current-schema
fixtures no longer inject future invalid duplicates; actual legacy migration fixture
now covers that history, including colliding teacher/student UUIDs.

Focused isolated PostgreSQL evidence: three tests pass, zero skipped
(/tmp/dm-receipt-identity-focused.log). The new test clones authoritative column
shapes into an owned schema, loads 50,003 receipts/25,001 pairs, runs actual migration
operations in explicit transactions and compares hashes of every original field
except the intentionally normalized Status. An injected index-name collision rolls
back the whole migration including normalization and check creation. Successful Up
preserves all rows, picks the deterministic earliest tie, and keeps the historical
check unvalidated. New inactive inserts, current deactivation and archived duplicate
reactivation fail. Independent raw writers establish snapshots before inserting at
ReadCommitted/RepeatableRead/Serializable, observe real PostgreSQL lock waits and
commit exactly one row per pair. Serializable may reject with 40001 instead of a
23505 uniqueness violation; both abort the loser, with no application retry. The
initial test incorrectly demanded 23505 at Serializable and was corrected to the
valid database semantics, without weakening the one-committed-row invariant.

Real HTTP acknowledgements after Up return the original first instant without adding
a row; active feed counts current identities; historical roster resolves each row's
own declared role even when identities collide. Down preserves all resulting fields
and flags. No public/live schema constraints were disabled to inject test history.
The private fixture's old first-read plan scans/sorts 50,003 rows (2.056 ms, 776 buffer
hits); upgraded lookup uses the native partial index (0.019 ms, four hits). These warm
single-query measurements are synthetic, not representative full-app latency or a
supported-user-count claim. PostgreSQL semantics references: https://www.postgresql.org/docs/current/indexes-partial.html
and https://www.postgresql.org/docs/current/sql-altertable.html .

Full regression/package results are recorded below after their completion. All seven
original completion requirements remain open. Scheduled announcement delivery,
wider producer/audience semantics, remaining versioned/durable record/module writers,
invariant/query/output/file/job audits, classroom allocation profiling, telemetry
configuration and longer representative mixed-school recovery/restore/deployment
verification still require independent evidence. No goal scope was reduced.

Full Core regression: 482 passed, zero skipped, 2m11s
(/tmp/dm-receipt-identity-full-core.log), including native receipt migration,
first-read races, historical roster and the shared retention lock-observer users.
Abstractions isolation (159 files), hosted-service tracking (23 services), rate-limit
route matching (403 routes) and enum alignment pass. No SPA/mobile contract or locale
changed in this increment, so no unrelated frontend package rebuild is required.

Final packaging: Core producer commit30c9a84, API rollout docs dc1ef18. Standard
sync-dotnet clean/build/pack/country rebuild/API restore/build passes
(/tmp/dm-receipt-identity-sync-dotnet.log). No producer source edits after packing.
Installed Afghanistan regression:106 passed, zero skipped
(/tmp/dm-receipt-identity-country.log). Producer/API SHA256 pairs match:
Core df20fc4649ffb1d366ea7b999c51efeb62310044ba9a5c2f6017ce5daa37e805;
Abstractions 87f3e875678ca67b7044f337f8e9fc95e5358473c30e6ce7c4ad8ea052e39ede;
country 59b81fcc7336519e143f151d1638f9210672244298c4155959897718658e2f79.
All verification/build handles are terminal. All sibling worktrees are clean before
this root evidence commit. No user API/SPA/Metro restart, live DB/developer Redis
mutation, provider activation, external message or push occurred. The broader goal
stays active with the original seven requirements unchecked.

## Resume increment 91 — bounded teacher leave pages and scalar person references (2026-10-30)

The previous turn made verified progress: increment90 committed/tested native receipt
identity. This continuation audited remaining write/read paths and found TeacherLeave
List loaded all school history with full Teacher/SubstituteTeacher entity profiles;
its shell list applied filters only to that unbounded in-memory result. Trace covered
TeacherLeave/version/covers JSON, TeachingOperationsRepository decisions/cover review,
controller request/decision/cancel and digest/automation consumers, mapper/DTO, shared
API/model, actual shell route/list, country/module/mobile callers and existing Core
GeneralParams/PagedList/AppTable/person-lookup contracts. The only SPA list caller is
the shared teacher/admin shell screen; no country/mobile consumer requires the old
unbounded endpoint or nested profile. No new persistent field/table, component or
service was added. Core's existing PersonLookupDto is the authoritative lightweight
identity representation, reused for teacher/substitute labels instead of inventing
another summary or transporting personal profile graphs. TeacherLeaveMapper maps
that existing reference for mutation replies too; the shared TS model narrows to the
same id/firstName/lastName shape. Source IDs, Version and lesson-cover data remain.

Core List now scopes active leave roots to nonempty school and teacher ownership,
combines creation dates/status/search, uses whitelisted native date/status sorting
with stable ID ties, and pages through the existing bounded PagedList (10 default,
50 maximum, safe extreme page handling). Existing ?status remains an alias for the
AppTable's ?leaveStatus; conflicting aliases return400 rather than broaden scope.
Search matches reason/decision note or local teacher name. A repeatable-read
transaction makes count/root page, bounded person-name lookup and batched audit
labels agree under concurrent changes. Teacher/substitute names are selected only
within the school, including inactive historical local teachers; foreign references
are not labelled. The response is no-store and all DB reads honor cancellation.

The shell consumes AppTable.fetchPageData/serverSort/reloadKey rather than keeping
an unbounded local list and its separate initial refresh. Core's serializer forwards
all applied status/search/creation-date/sort/pagination criteria, request signal and
account token. Filters remain in AppTable, including when no rows match. Refresh
preserves criteria; CSV/PDF share complete filtered page loaders. Teacher export
values explicitly render names, avoiding object serialization. Civil leave ranges
use the active calendar with UTC date-only formatting in cells and exports.

Focused real HTTP/PostgreSQL test passes (/tmp/dm-leave-read-focused.log): 60 tied
rows plus statuses/dates/foreign references, two stable pages, combined filters,
legacy alias/conflicting aliases, extreme-page empty result, teacher ownership,
foreign-school separation, unauthorized student rejection, cancellation, inactive
local substitute names, hidden foreign substitute, scalar nested response fields,
no credential/contact columns in leave SQL, real mapper mutation-reference shape,
and a concurrent update between count and page proving repeatable-read consistency.
The actual screen/shared AppTable/API serializer checks extend the existing test
harness (/tmp/dm-leave-read-ui.log), proving one request per Apply, signal forwarding,
combined zero status/search/dates, page/refresh retention, full50-row export page
criteria, CSV without object serialization, PDF loader rows and Reset. Existing
fees/audit/assignment/shared filter tests remain in that same harness.

Full regression/build/install results follow after completion. This closes the
unbounded teacher leave list and profile expansion, not the remaining mutation
work: request/cancel still need durable intent/precondition/authority review, decision
retry/notification behavior needs its own audit, and large lesson-cover JSON/cover-plan
bounds and representative leave index/query plans remain. All seven original
completion requirements stay unchecked; no production capacity claim or scope cut.

Source Core TypeScript and installed shell TypeScript pass after standard SPA sync.
Full source UI/export/form/module audit passes:104 AppTable sites, all three locales,
including the extended actual teacher leave screen/filter/export checks
(/tmp/dm-leave-read-pdf-audit.log; artifacts /tmp/dm-leave-read-pdf-audit). SPA Core
producer6ce64bb was committed before build/pack/install; producer source unchanged
after packing (/tmp/dm-leave-read-sync-spa.log). No locale/mobile contract changes.

Full Core regression:483 passed, zero skipped, 2m18s
(/tmp/dm-leave-read-full-core.log), including actual repeatable-read concurrent
leave edits and actual TeacherLeaveMapper output. Core producer fdbaa74 committed
before standard backend clean/build/pack/API restore/build; sync passes
(/tmp/dm-leave-read-sync-dotnet.log). Installed Core and source artifacts match:
Core SHA256 82c76726c9bb5cf1a5a58f173678a2feb273f044223710ee0054c2c33f2be695;
Abstractions bcb0a39084b38dac67f4c015ec9f8b01b7c75cc687546aeade52393fbe02ed70;
country 5a7c0239021b5604545a168bbba8a1b6e8d92dd5ac0d3f67169d072323f22b58.
API rollout docs a21eaa4; shell source/lock95879cfd; AF lock14819a3; AT locke841241.
No producer source changed after packing. No mobile package change was needed.

Installed Afghanistan regression:106 passed, zero skipped
(/tmp/dm-leave-read-country.log). All test/build/install handles are terminal.
All sibling worktrees checked clean before root evidence commit. No live database/
developer Redis mutation, user API/SPA/Metro stop/restart, provider activation,
external message or push occurred. Apply the coordinated API/SPA package update
through the usual user-controlled restart. The original seven-area goal stays active;
next carry forward teacher leave mutation recovery/authority/notification work rather
than claiming the list audit completed the write paths or entire goal.

## Resume increment 92 — atomic teacher leave creation and recoverable request intents (2026-10-30)

Increment91 was verified progress (paged leave reads), not completion of mutations.
Discovery followed TeacherLeave's existing Version/cover JSON, RequestLeaveDto and
validators, shared TeachingOperationsRepository school lock/cover planning, Decide's
version check, Cancel's current transaction, every controller notification helper,
MutationReceiptStore/MutationAuthorization, notification audience/preferences/staging/
publication, existing announcement stream, actual shell request form/API and shared
editor/deletion/intent/form primitives. Request previously committed leave/covers
before saving notifications and had no replay receipt; lost responses became overlap
errors. Decisions/cancellation need further work and were not silently declared done.

No persistent field/table, receipt service or second leave model was added. Request
reuses Core MutationReceiptStore and the existing TeacherLeave/Version. Core's
AppLeaveRequest consolidates the existing shell request form (old markup/handlers
removed), consuming Core AppForm/fields/modal/footer and existing editor/intent state.
The shared editor's generic creation mode now accepts ordinary object forms without
requiring a fake Revision on the existing Version model; versioned reads and accepted
edits still require a real revision by default. The existing creation-only opt-out is
explicit and the new consumer validates a nonempty returned ID. No unversioned edit
path was introduced. Core owns this cross-country leave workflow and form.

POST teacher-leave requires Idempotency-Key and has the existing runtime expensive
operation marker/request-size bound. The receipt transaction owns the existing school
teaching lock, current account checks after receipt/school waits, overlap guard,
scalar requester identity, leave/cover/audit saves, preference-aware operator inbox
batches and immutable encrypted result. Overlapping distinct intents serialize on
the same school lock; same intent/payload replays without replanning or publishing.
Replay after later cancellation returns its original requested status/version and
never restores the row. Mutation failure rolls back every row/audit/notification and
receipt; explicit retry keeps the intent. Teacher profile credentials are not loaded
just to build request identity. Current authorization is rechecked after planning,
every inbox batch and final mapping. New infrastructure errors are controller-local
English/Dari/Pashto resources, reusing the established shared error contract.

Recipients reuse SchoolNotificationAudience.Operators(teacherLeave.write), covering
active owner/principals/head masters/granted staff, with existing preference checks.
Each keyset batch is at most250, and saved inbox rows detach before the next batch.
NotificationAccountAccess rechecks that capability for leave-request staff delivery.
Inbox is authoritative. Only new committed requests attempt best-effort live delivery;
failed external publication cannot turn success into500. The existing announcement
related-inbox stream moved into NotificationRepository.StreamRelated and both
producers consume it; no copied stream or extra public service/interface was added.
No durable external push/outbox or exactly-once external delivery claim is made.

The shared request form retains draft and ID through failed/unknown outcomes, pins
credentials/signal, prevents duplicate submits/pending dismissal, and ignores
abandoned/account-generation completions through the existing editor lifecycle.
Token renewal retains the intent; a newly opened operation gets a new ID. No automatic
retry or persisted draft was added. Existing date-range validation now accurately
states the366-day inclusive bound in all three SPA locales and mobile mirrors.

Focused isolated PostgreSQL/HTTP tests:3 passed, zero skipped
(/tmp/dm-leave-request-focused.log), including existing announcement producer and leave
read regressions. Twelve same-intent requests across two real hosts commit one leave/
receipt, two bounded inbox batches and260 preference-filtered notices. Tracked inbox
entries stay at most250. Live failure still returns200 after an independent context
sees committed receipt/source. Changed fingerprints have localized details in all
three languages; missing key428, validation400 and nonteacher403. An overlapping
intent fails; replay after later cancellation preserves the original result. Injected
second inbox-batch and receipt failures roll back leave/inbox/receipt, then explicit
same-ID retry succeeds. Actual receipt-lock and school-lock waits recheck deactivated
accounts before exposing replay/new rows. Canceled lock waits leave no receipt and
permit explicit retry. Competing distinct overlapping intents commit exactly one.
Existing probes/hosts are extended/reused rather than copied: one optional predicate
on the advisory-lock observer, a shared leave host composition and a transactional
notification probe now used by both producers.

Real form tests extend the existing multilingual teaching harness
(/tmp/dm-leave-request-ui.log): required/range validation, preserved fields/error,
trimmed payload, stable UUID through503/token renewal, pinned renewed token/signal,
real fixed-footer button submission, pending Escape refusal, one accepted callback,
new-operation ID and aborted/unmounted late-result suppression. React review follows
the previously applied react-best-practices skill with project Core primitives:
Formik owns values, shared lifecycle owns async state, stable scope keys reset account
forms, no duplicate effect-driven request, and native labels/forms/footer remain.

Full regression/package/consumer results follow below. Cancellation expected-version/
durable intent/authority and decision replay/notification transactions remain next,
along with cover-plan resource bounds and representative leave query/index evidence.
All seven original overall requirements remain open; no goal scope was reduced.

Final access audit found that StaffRoleAuthorizationHandler can satisfy static role
attributes for management capabilities. Creation now additionally requires an actual
TEACHER identity and nonempty school before receipt execution. The regression assigns
a granted staff account the same UUID as a real teacher and verifies request403;
teacher leave management permission cannot impersonate that teacher. This was added
before backend packing and the entire Core suite rerun. Final full regression:484
passed, zero skipped, 2m11s (/tmp/dm-leave-request-full-core.log). The earlier full run
also passed484 before this additional role-collision case; only the final log supports
the final backend source. No assertion or permission boundary was relaxed.

Source Core types and installed shell types pass. Full source shared UI/form/export/
module audit passes104 table sites in all three locales
(/tmp/dm-leave-request-pdf-audit.log; artifacts /tmp/dm-leave-request-pdf-audit).
SPA producer13e8faf; country locale producer d01c42b; mobile locale producer84466d8
committed before standard sync-spa/sync-mobile build/pack/install. No producer bytes
changed afterward. Logs: /tmp/dm-leave-request-sync-{spa,mobile}.log. Six installed
mobile language files byte-match source. Consumer commits: shell9c452535; AF SPA
lock0201361; AT lock825e929; parent383bf4a; student800234c. API rollout docs d7e1614.

Final Core producer d1b1d30 (role-collision guard included) was committed before
standard backend clean/build/pack/country/API restore/build. Sync passes
(/tmp/dm-leave-request-sync-dotnet.log); no source edits after packing. Installed
producer/API SHA256 pairs match:
Core d62b7b3facd71488c0aefdae21b967a743aa285d37292aac87b02fd560d88069;
Abstractions f6799c0542eeb33d11d52b9aea369f13e0e3db20590bb8b05b87f96cf5d672da;
country 04b7b80230ee7dff1c5e40493c71a7bbe51a91d5cbd4c4aa683c8bfea41ce794.
The related-inbox stream reuses the existing RelatedFanout index (school/type/related/
Id, predicate related IS NOT NULL); no duplicate lookup index/migration was added.

Installed Afghanistan regression:106 passed, zero skipped
(/tmp/dm-leave-request-country.log). All build/test/install handles are terminal;
all sibling worktrees checked clean before root evidence commit. Shared locale/
package/enum/abstraction/worker/route gates pass through local commits. No live DB
migration/developer Redis mutation, user API/SPA/Metro stop/restart, provider
activation, external message or push occurred. API/SPA rollout remains coordinated
and user-controlled; packing does not load a running process's stale assemblies.
All seven original completion requirements remain open. Next carry forward teacher
leave cancellation preconditions/durable replay and approval/notification transaction
recovery, then resource/index/operational audits rather than equating creation with
completion of the wider objective.

## Resume increment 93 — versioned atomic leave cancellation and explicit conflict review (2026-10-30)

Increment92 was verified progress on creation, not cancellation/decisions. Discovery
traced TeacherLeave's existing Version concurrency token/cover JSON, cancel/decide
school locks and consumers, recorded TeachingLesson evidence/responsibility reads,
request/decision notification producers, shared receipt/authorization/version checks,
list DTO hydration and absent detail read, notification audience/batching/streaming,
actual shell cancellation and API, and shared confirmation/conflict controls. No new
persistent field/table, alternate version, receipt store, component or service was
added. Existing Version remains authoritative. RecordVersions.Check now accepts an
actual Guid as well as IRevisionedRecord; both use the same missing/stale precondition
protocol. useRecordDeletion gains an opt-in version accessor, retaining revision as
the default. This extends Core for legacy Version aggregates without fake fields or
copied confirmation state. Existing event/announcement consumers keep their defaults.

Cancellation requires Idempotency-Key and ?version=. It uses the receipt transaction,
existing school teaching lock, physical scoped leave FOR UPDATE, current authority
after waits, ownership and observed-version checks. Missing/empty version428 and stale
version409 use the shared localized record problem contract. Invalid current states
remain rejected. Accepted cancellation advances Version and updates current leave
state/audit once; cover JSON and all delivered lesson/evidence history remain intact.
Immutable original results replay without restoring later corrections or notifying
again. Inbox and receipt failures roll back the cancellation/audit/notices together.
The runtime expensive-operation marker covers its potentially large operator fan-out.
No live migration or new schema was needed.

Existing cancellation templates stage notifications before commit: teacher withdrawal
notifies scoped operators with teacherLeave.write; management cancellation notifies
the current local teacher-family identity. Stand-in withdrawal uses actual current
teacher-family roles, deduplicated cover IDs and school filtering. Cancelled notices,
including cover withdrawals, use existing TEACHER_LEAVE_CANCELLED so the related
postcommit stream cannot accidentally resend earlier SYSTEM cover assignments. This
also means that category's notification preference governs withdrawal notices; no new
enum/preference category was created. Staff delivery rechecks teacherLeave.write.
Publication is best effort after commit and skipped for replay; no external outbox
or exactly-once transport promise. The existing Native RelatedFanout index fits.

The duplicate keyset recipient loops in request and announcement creation moved into
SchoolNotificationAudience.ReadBatches; cancellation reuses it, with the same250-row
bound and per-producer authorization/staging. One existing Core class now owns batch
traversal. New GET teacher-leave/{id} is the missing scoped comparison read, reusing
the existing DTO and extracted bounded list hydration rather than a parallel model.
List/detail hydration share local scalar names and batched audit labels in a
repeatable-read snapshot; teachers only see their own and foreign schools get404.

The shell's old unguarded inline Cancel handler now consumes shared confirmation
ownership, durable intent and AppRecordConflictComparison. Selected Version and
intent survive failures and close/reopen. A409/428 blocks confirmation until explicit
review/replacement; replacement starts a new intent but never submits automatically.
The user confirms again, and a saved cancelled/rejected row cannot be cancelled.
Pending dismissal/double actions and late account/unmounted effects use the existing
Core guards. API serialization pins account credentials, passes version/key and
validates matching ID, CANCELLED state and a new nonempty accepted Version before
reporting success. Calendar-aware UTC civil dates are used in confirmation/comparison.
Successful cancellation reloads the shared table with applied filters retained; empty
results keep controls visible. One failure message ships in all three SPA/mobile
language owners. No duplicate form, raw input/table or new country rule was added.

Focused real HTTP/PostgreSQL suite:4 passed, zero skipped
(/tmp/dm-leave-cancel-focused.log), including prior request/list/announcement producer
regressions under the shared batch reader. Ten identical cancellations across two
hosts commit one status/version/audit/inbox outcome. Missing key/version, localized
version problems, actor/school isolation, scoped no-store detail, actual principal
recipient roles, preference/foreign/ungranted exclusion, immutable replay after later
correction, changed fingerprints and invalid current state are checked. Original
SYSTEM assignment is not republished. Complete stored TeachingLesson JSON and stored
cover JSON are unchanged. The initial assertion compared pre-database JSON text to
PostgreSQL-normalized JSON; it now compares stored-before/stored-after bytes and
structural DTO covers rather than treating whitespace/key order as changed history.
Injected second inbox-batch and final receipt failures roll status/version/audit/inbox
back; same-ID retry succeeds even with failed external delivery. A direct writer
bypassing the school lock wins before parent lock release and causes409; staff grants
revoked during an actual physical leave lock wait cause403. Existing approval and
cancellation compete under the same school lock/Version, with one200 and one409.

The first staff wait timed out because the previous lightweight leave host lacked
production's StaffRoleAuthorizationHandler. The shared host now registers that real
handler/filter (without starting unrelated classroom background services). Existing
request role-collision tests rerun through the real staff handler too; no permission
or assertion was relaxed to make the wait pass. Teacher builders/probes/hosts are
extended/reused rather than copied.

Real shell/shared table/API/confirmation/comparison tests extend the existing harness
(/tmp/dm-leave-cancel-ui.log): same Version/key after503 and close/reopen, pinned token,
stale save blocked, explicit saved-values comparison, no automatic submit, fresh
intent only after accepted replacement, pending Escape/double-submit guard, accepted
result validation and filtered refresh/empty controls. Existing filter/PDF/CSV cases
remain. Full regression/package/install evidence follows below. All seven original
requirements stay open; decision durable replay/notifications, cancellation dense
cover bounds, resource/index and operational audits still need their own proof.

Full Core suite:485 passed, zero skipped, 2m16s
(/tmp/dm-leave-cancel-full-core.log). Source Core TypeScript passes. Full source shared
UI/form/export/module audit passes104 table sites/all three locales
(/tmp/dm-leave-cancel-pdf-audit.log; artifacts /tmp/dm-leave-cancel-pdf-audit). An
additional focused UI assertion after that full audit rejects an HTTP200 reply with
a different record ID, keeps the confirmation open and retries with the same intent
(/tmp/dm-leave-cancel-ui.log); production sources did not change for that added test.

Producer commits before packing: Core2636cdf; SPA Core1b05900; AF locale1cc70d6;
mobile locale32582e9. No producer source edits after packing. The existing internal
recipient reader, real version protocol/default confirmation consumers and new
Version accessor were reviewed for scope ownership, stable callbacks and explicit
replacement rather than a parallel local implementation. Standard package/consumer
verification results follow below. No whole-goal completion is inferred.

Standard backend/SPA/mobile build/pack/install all pass
(/tmp/dm-leave-cancel-sync-{dotnet,spa,mobile}.log). Installed shell TypeScript passes
(/tmp/dm-leave-cancel-shell-types.log). Installed Afghanistan regression:106 passed,
zero skipped (/tmp/dm-leave-cancel-country.log). Six installed mobile locale bundles
byte-match source. Producer/API SHA256 pairs match:
Core e4255070f18e6b87d52089e63ceb0923460881d483a4f208dc381675a1538665;
Abstractions 663fd17fc90c6565c585a0a17a77a64ad941bed01b77f2f623c2ad3c6970e666;
country ec2be7f472a98d502fbd3c3bc55f056c346aef156422e09914c15432c548e567.
API rollout docs e6a275a; final consumer commits recorded below. All verification and
build handles are terminal; no producer source edits after packing. No live DB/
developer Redis mutation, user API/SPA/Metro stop/restart, provider activation,
external message or push occurred. Full objective remains active with all seven
original requirements open; next focus is decision replay/notification recovery,
then the broader resource/query/invariant/operational audit, preserving original scope.

Final consumer commits: shell fd540532; AF SPA lock da29a4c; AT lock7b44f57;
parent936238a; student9af4b74. All sibling worktrees checked clean before this root
evidence commit. Shared local commit gates (locale/package/enum/abstraction/worker/
route/control checks as applicable) pass. Cancellation is one completed increment,
not completion of the unchanged seven-area goal.


## Resume increment 94 — durable leave decisions and authoritative cover review (2026-10-30)

Discovery traced DecideLeaveDto.ClientRequestId/Version, TeachingOperationsRepository
and its trusted callers, TeacherLeaveController request/cancel/decision flows,
MutationReceiptStore, notification staging/reader, actual staff authorization,
AppLeaveCoverDecision, useVersionedRecordEditor, AppTable and tableReport. The body
already contains the authoritative intent ID: reuse it rather than adding another
header/field. No persistent field/table, country rule, new locale or mobile change
is needed. Shared behavior remains in backend Core and spa-core.

BaseController extends the existing DurableMutation protocol with a body-ID overload.
Decision execution reuses the existing business engine inside the receipt-owned
transaction, school advisory lock and physical parent lock. Current authorization
is rechecked after waits and before commit; Version is required and stale changes
return the standard explicit-review conflict. Prior actual approved cover identities
are captured under the lock. Requested proposals are not prior assignments and do
not produce withdrawal notices on rejection. The trusted repository wrapper keeps
its old LessonStale exception contract without duplicating decision rules.

Decision, receipt and inbox rows commit together. Owner/substitute/withdrawal notices
use actual teacher-family roles, existing preference handling and DECIDED type.
The existing bounded reader optionally selects the IDs staged by this operation;
replanning cannot republish earlier decisions. These IDs are transient: no duplicate
event column, new table or repurposed RelatedEntityId. Replay never republishes;
postcommit transport failure cannot turn a saved decision into an API failure.
This is atomic inbox persistence, not a new durable external transport outbox.
Cancellation reuses staging without accumulating unused publication IDs.

Cover-plan reads use a repeatable-read snapshot and fresh authorization after commit,
with no-store and the existing expensive-read guard. Existing response metadata is
extended with authoritative status/note. Approved plans preserve stored choices and
explicit gaps; delivered lessons retain their actual teacher. Duplicate stored
lesson choices fail review. Existing legacy single-substitute fallback is retained.
The same leave Version remains the sole concurrency token, not a fake Revision.

The shared versioned editor accepts a minimal optional Version getter, preserving
all default Revision consumers. Cover editing reuses account epochs, captured tokens,
cancellation, intent ownership and Core explicit comparison. Compact Formik values
exclude candidate graphs. Retries retain note/choices/intent, accepted replies are
validated, and saved-values replacement is explicit and never submits automatically.
Approved/rejected/cancelled controls follow the authoritative read. Exported teacher
names reflect current choices instead of the initial proposal.

CSV now reuses existing tableReport/display/exportValue formatting, with translated
headers, native dates, booleans and human references, logical column order and proper
quoting. PDF's default boolean formatter uses existing translated yes/no keys.
Formula-like CSV text receives an Excel-facing tab prefix inside quotes, following
https://community.owasp.org/attacks/CSV_Injection ; this human report is not a
machine-lossless CSV contract or a guarantee across all spreadsheet programs.
Broader export ownership/resource bounds remain open.

Evidence: focused backend8 passed (/tmp/dm-leave-decision-focused.log), full Core486
passed/zero skipped in2m11s (/tmp/dm-leave-decision-full-core.log). Real PostgreSQL,
two JWT/Kestrel hosts, production staff handler: ten identical intents, canonical
replay, stale versions, immutable replay after replan, exact new notification IDs,
proposed-only rejection, inbox/receipt rollback, live publication failure, actual
recorded lesson/daily attendance preservation, locked-slot conflicts, grant revocation
while physically blocked, and fresh authorization after snapshot reads.

Real shared UI tests in all three locales cover503 retry, token renewal, body-only
intent, explicit conflict comparison, changed saved note/assignments, invalid200,
pending/unmount guards, validation, live teacher export and safe localized CSV
(/tmp/dm-leave-decision-ui.log). Source Core TypeScript passes. Full shared UI/form/
export/module audit passes104 table sites (/tmp/dm-leave-decision-pdf-audit.log;
artifacts /tmp/dm-leave-decision-pdf-audit). Added real PDF hook boolean assertions
also pass (/tmp/dm-leave-decision-boolean-pdf.log). React skill review checks shared
primitives, stable scope/callback ownership, candidate graph size and keyed summary
lookups. Final DTO edit only clarifies existing fields' comments.

All seven original requirements remain open. This increment closes decision replay/
notification recovery, not the broader goal. Dense cover/candidate/timetable query
bounds, remaining editor/invariant/query audits, background and runtime coordination,
representative mixed load, operational recovery and restore evidence still require
work against the original checklist. Package/install evidence follows below.


Increment94 final installation: backend Core2d6b42c, SPA Core43237e8 were committed
before standard backend/SPA packing; no producer source edits after packing. API
rollout docs3ec8c96; installed shellc7a04ede, AF SPA lock1987de0, AT locka636fd2.
Standard syncs pass (/tmp/dm-leave-decision-sync-{dotnet,spa}.log). Installed shell
TypeScript passes (/tmp/dm-leave-decision-shell-types.log); installed Afghanistan
regression106 passed/zero skipped (/tmp/dm-leave-decision-country.log). No mobile
package/source change. Producer/API SHA256 pairs match
(/tmp/dm-leave-decision-dll-hashes.log):
Core1fe72c5f0cdf15653417d85fb61ad60500ffc79f04b7e018e20ee4f2c287fb9d;
Abstractions490d82c977b884012cf5b45ed9ef5489631ad4565ab3eed85b62b8878a312e44;
country922b1c33a67161b58dbc5f6fdd06dc3cce5b1c02eec36bbd731f69bf0af9f85f.
All build/test/commit handles are terminal. All sibling worktrees checked clean
before this root evidence commit. Local commit gates pass. No live DB/developer
Redis mutation, user server stop/restart, external message, provider activation
or push. All seven original requirements remain open with scope unchanged.


## Resume increment 95 — stream school book downloads (2026-10-30)

Discovery found the existing Core book upload limit is 20 MiB, but the download
endpoint read each complete PDF into a new byte array before returning it. At
concurrency, memory therefore scales with active download count times file size.
No new storage model or download service is needed: Core's existing endpoint and
`ExpensiveOperation` request-admission marker own this shared behavior. The route
now streams the file asynchronously and sequentially with range support and is
admitted through the existing expensive-operation limit. Its school/global-book
authorization, HTTPS redirect, content type and download filename remain intact.

Core Release build passed with 68 existing warnings and zero errors; Core
pre-commit gates passed (localization, mirrored enums, hosted-service health and
abstraction isolation). The standard `sync-dotnet.sh` pack/install/API build
completed successfully, including Afghanistan; it did not restart the user's
API process. The change is Core commit `90b25ca`. No new test was added or run.

All seven original completion requirements remain open. This reduces per-request
download memory and caps simultaneous large downloads per API process/school; it
does not provide distributed admission across API instances or settle the wider
exports, invariants, job coordination, telemetry and mixed-load evidence.


## Resume increment 96 — remove global request-body buffering (2026-10-30)

Inspection of the API, Core controllers and Afghanistan module found no consumer
that reads and rewinds arbitrary request bodies. The only request-body rewind is
payment webhook signature verification; its existing Core resource filter already
buffers only that endpoint, with a 64 KiB buffer limit and a matching request-size
limit. API startup had separately enabled unbounded buffering for every request.
That global middleware is removed, so large form/JSON requests no longer incur
memory or temporary-file buffering merely by entering the API. Webhook verification
keeps its endpoint-specific bounded behavior unchanged.

API Debug build passed with four existing package-vulnerability warnings and zero
errors; API pre-commit build and the explicit rate-limit-route consistency check
passed. The change is API commit `74361aa`. No server was restarted and no tests
were added or run. The remaining multi-instance, invariant, broad query/output,
telemetry and representative mixed-load requirements remain open.


## Resume increment 97 — coordinate school daily digests across API instances (2026-10-30)

Discovery found SchoolDailyDigestBackgroundService used a query-then-NotifyMany
check for existing same-day rows. Two API hosts could both observe no row and
persist duplicate digests. The whole-school ID list was also materialized before
the sweep, and recipients/messages were materialized without the reusable batch
path. Core already owns `RecurringSchoolNotifications`, its PostgreSQL
transaction-scoped advisory lock, the existing `SchoolAutomationReceipt` table,
account/preference filtering, keyset recipient pages and post-commit publication.
The digest now uses that existing shared path and source-pages active schools.

The recurring plan contract now permits an absent action URL and an explicit
notification-related-entity choice; existing rules default to their former
source-linked behavior. The digest explicitly preserves its old null action URL
and related entity. Its occurrence key is the database UTC date; the per-recipient
receipt prevents a second send across instances/restarts. During rollout, matching
legacy null-related digest rows are adopted into receipts before deciding whether
to notify, avoiding a duplicate on the first run. Message rendering now uses each
recipient's existing preferred language with the school's country default as
fallback. No table, field, migration, parallel lock or digest-specific receipt
store was introduced.

Core Release build and all Core pre-commit gates passed. Standard `sync-dotnet.sh`
passed, rebuilding/packing Core and Afghanistan and restoring/building the API.
No tests were run or added in this increment, and no user server was restarted.
The change is Core commit `19f23c7`. The rest of the multi-instance job audit,
record invariants, wide query/output review, telemetry collection and representative
mixed-load evidence remain open.


## Resume increment 98 — bound message contact lookup and debounce search (2026-10-30)

The message-contact endpoint previously materialized every active teacher,
parent, student and eligible staff member, then applied substring matching and
sorting in application memory for each search keystroke. It now uses no-tracking
SQL projections and filters/sorts before materialization, with at most 100
contacts per role (401 maximum including the school-admin entry). The UI keeps
the existing Core `AppStandaloneInput`, debounces search by 250 ms, and uses a
request generation guard so a late response cannot replace results for newer
input or a closed dialog. The hint is translated in Core English and Afghanistan
Dari/Pashto; it explains the per-role bound and that search covers omitted names.
Staff recipient lookup additionally requires the role assignment and custom role
to belong to this school, closing a missing tenant predicate on this query.

Discovery confirmed the existing `MessageContactDto`, `AppStandaloneInput`, and
school-scoped identity tables already own the representation; no duplicate DTO,
contact table or search component was introduced. Core Release build and its
pre-commit gates passed. SPA shell, spa-core and Afghanistan package builds and
their commit gates passed. Standard `sync-all.sh` rebuilt/installed Core, the
Afghanistan backend module, API, spa-core, both country SPA modules and the shell
packages. Package-lock integrity updates were committed in each affected SPA
consumer. No tests were run, no migration was added and no user server was
restarted. Commits: Core `cc954fb`; shell `232db134`; spa-core `5618dd2`;
Afghanistan `9fa4cdd`; consumer locks `8d00a07a` and `2c75821`.

The query limits application materialization and network output; the broader
search/index audit still needs representative database plans. Other list/report
bounds, invariants, cross-instance jobs/state, telemetry and multi-school load
evidence remain open.


## Resume increment 99 — batch sibling-class occupancy during allocation (2026-10-30)

The enrollment audit traced registration, manual enrollment, student import,
promotion, transfers, class-capacity edits and academic-year policy updates.
They reuse Core `EnrollmentCapacity` and the same school-scoped PostgreSQL
advisory lock; no alternate enrollment store or independent capacity policy was
needed. Automatic assignment did have a query-growth issue: when the selected
class was full, it queried occupancy once per sibling section. For a full set
of N sections that added N database round trips while holding the school lock.

Core now loads active sibling sections once and obtains distinct active-student
occupancy for the set in one grouped query, then picks the first section under
its own configured capacity. It preserves the existing school/year/status
occupancy rules and section ordering. No schema, field, service, or API contract
was added. Core Release build passed with 69 existing warnings and zero errors.
No tests were added or run. The broader multi-school query-plan review,
multi-instance auditing, telemetry and representative load evidence remain open.


## Resume increment 100 — admit ministry and teaching-register report workloads (2026-10-30)

The export audit found Afghanistan ministry workbook endpoints and the Taraqi
and monthly attendance register endpoints were not marked as expensive. The
shared Core request-admission middleware already uses endpoint metadata to
limit simultaneous expensive work per process and per school, and Afghanistan
already consumes that Core extension. Those report routes now use the shared
marker; static workbook templates and ordinary file downloads remain on normal
request capacity. No new module-local throttle or duplicate policy was added.

Afghanistan Release build and standard `sync-dotnet.sh` passed, including the
API consumer build. No tests were run. This is per-process admission control; it does not coordinate
expensive work across API replicas or provide end-to-end streaming for workbook
generation.


## Resume increment 101 — protect the fee dashboard aggregate

The fee dashboard report computes totals and monthly aggregates across a
school-year's fees and groups fee balances by retained class allocation. It was
not marked for the existing Core expensive-operation admission budget. The
route now uses that shared endpoint metadata, matching the existing bulk fee
generation and rollover operations. No new throttle or per-module policy was
introduced. Core Release build passed with 69 existing warnings and zero
errors; standard `sync-dotnet.sh` and API build passed. No tests were run. Query plan and
representative-volume measurements for the report remain part of the broader
query audit.


## Resume increment 102 — cancel fee generation with the HTTP request

The bulk fee-generation route already uses the shared expensive-operation
limit, and `FeeRepository.GenerateForMonth` already accepts a cancellation
token. Discovery found the controller omitted it for both the initial
school-student materialization and the repository call, and also omitted it
from the follow-up notification fan-out. The endpoint now forwards the request
cancellation token through all three stages. Core Release build passed with 69
existing warnings and zero errors. Standard `sync-dotnet.sh` and API build
passed; no tests were run. This only cancels pre-commit work; it does not
introduce retries or change fee idempotency.


## Resume increment 103 — aggregate class-performance dashboard queries

Inspection of the Core class-performance dashboard found one grades query per
course, all attendance rows since the trend start (including unused future
dates), and full enrollment/assignment ID lists materialized only for counts.
Core now groups grade buckets by course in SQL, groups attendance by day with
both range bounds in SQL, counts enrollments and assignments in the database,
and counts submissions through their assignment relation. The existing
`ClassPerformanceDto` and field semantics are retained, including historical
enrollment and attendance-row counts. The class and course reads are now
no-tracking; every DB operation in this request receives the cancellation
token. Core Release build passed with 69 existing warnings and zero errors.
Standard `sync-dotnet.sh` and API build passed. No tests were run; representative
query-plan and output comparisons are still needed.


## Resume increment 105 — page and scope the alumni directory

Discovery traced the alumni API to its sole consumer, `AlumniDirectory`, which
already uses `AppTable` but fetched every row separately and supplied a dummy
page loader. Core now binds the existing `UserParams`, applies AppTable's
creation-date filter and name search, returns the standard pagination header,
and receives request cancellation. The screen now fetches pages through the
existing AppTable request/export lifecycle, so applied filters carry into its
exports. Final-class history is projected to only the required fields for the
current page and explicitly scoped to the current school; this also prevents a
transferred alumnus's later class at another school from leaking into this
directory. The existing DTO and table component were reused; no new DTO,
component, field or table was introduced. Core Release build and spa-core
TypeScript build passed. Standard `sync-all.sh` completed its Core, country,
API, spa-core and country/shell package swaps; shell `npx tsc --noEmit` passed.
No tests were run. Query plans and response equivalence need representative
data.


## Resume increment 106 — page withdrawal history and fetch certificates directly

The withdrawal admin table loaded the entire school history, and the certificate
screen loaded that same full list just to locate one record. Core now pages the
existing withdrawal DTO through `UserParams`, including AppTable creation-date
and student filters, and returns the standard pagination header. The API adds a
school-scoped single-record GET using that same DTO, and the certificate now
requests only its target row. The table uses AppTable's paging/export lifecycle;
record and refresh actions reload its current query. Existing per-student
history remains available. No new data model or table was added. Core Release
and spa-core TypeScript builds passed. Standard `sync-all.sh` completed and
shell `npx tsc --noEmit` passed; no tests were run. Real workload timings
remain unmeasured.


## Resume increment 104 — bound root benchmark query work

The cross-school benchmark endpoint groups activity across every tenant. Its
queries were not no-tracking, had no request-cancellation tokens, and the
aggregate projections contained eager-load directives that do not contribute
to grouped scalar results. The endpoint now uses the shared expensive-operation
admission budget, no-tracking aggregation, and request cancellation for every
query; unused aggregate includes were removed. The returned per-school and
weighted grand-total DTO remains unchanged. Core Release build passed with 69
existing warnings and zero errors. Standard `sync-dotnet.sh` and API build
passed; no tests were run. Real cross-school data volume and query plans remain
to be measured.


## Resume increment 107 — make birthday notifications safe across API instances

Birthday notices previously used a read-before-send check against the inbox.
Two API hosts could both pass that check and notify the same recipients. The
job now uses Core's existing recurring school-notification pipeline, which
commits per-recipient receipts with inbox rows under a PostgreSQL advisory
transaction lock. It retains the existing notification data, type, audience,
localization, and 06:00 UTC schedule; no new table or field was introduced.
Existing inbox rows inside the recurrence window are adopted into receipts.
Core Release build and standard `sync-dotnet.sh` (including API build) passed;
no tests were run. Real multi-host execution and workload timings remain to be
measured.


## Resume increment 108 — serialize and bound fee reminder delivery

The hosted fee reminder and the manual “send now” endpoint shared an
eligibility timestamp, but both could read a fee as due, stage duplicate
notifications, and only then update `LastReminderSentAt`. Core now keyset-pages
due fees in batches of 100 and locks/rechecks each existing Fee row inside a
transaction using PostgreSQL `FOR UPDATE`. It stages the existing inbox
notifications and advances the existing cadence field in that same commit;
post-commit realtime delivery remains best effort. Parent lookups are batched
per page and constrained to the matching school. No new field, table, or
parallel receipt was needed. Core Release build passed with 67 existing
warnings and zero errors. Standard `sync-dotnet.sh` completed, including the
Afghanistan package and API builds; no tests were run. Concurrent-host behavior
and production-volume timing still need runtime evidence.


## Resume increment 109 — coordinate teacher-leave notifications across hosts

The 07:00 UTC teacher-leave worker used inbox existence checks before sending
the daily school digest and three-day no-substitute reminders. Concurrent API
hosts could both pass those checks. Both paths now use Core's recurring
notification receipts, per-source PostgreSQL transaction locks, bounded source
pages and commit-before-publication behavior. The digest keeps one notification
per school/day and caps its displayed teacher lines at 30 while reporting the
full leave count. Upcoming reminders retain the existing notification type,
per-leave association, calendar-formatted date and three-day cadence. No new
table, field or duplicate job ledger was added. Core Release and the standard
`sync-dotnet.sh` Core, Afghanistan package and API builds passed; no tests were
run. Live multi-host delivery and production-volume timing remain unverified.


## Resume increment 110 — page and deduplicate password-hygiene reminders

Password hygiene previously materialized all eligible teachers, parents and
students, then checked recent notifications in process memory before sending.
Two API hosts could pass that check concurrently, and memory use grew with the
full eligible population. The initial-password and 180-day-expiry paths now
reuse Core's recurring notification receipts, per-account advisory locks,
bounded source paging and post-commit publication. The existing notification
type, links, localization keys, Monday 08:00 UTC schedule and seven-day
reminder cadence remain. Account eligibility reuses existing password-change
fields; no schema, receipt table or new persistence was added. Core Release and
standard `sync-dotnet.sh` (Core, Afghanistan package, API build) passed; no tests
were run. Live multi-host behavior and workload measurements remain open.


## Resume increment 111 — coordinate the global operations digest

The weekly operations digest scanned all root-user IDs and used an
application-level read-before-send check, allowing duplicates across API hosts.
The school-owned automation receipt table cannot represent this platform-wide
job because its notifications use `SchoolId = Guid.Empty`. Core now reuses the
existing notification inbox as its durable checkpoint, a week-scoped
PostgreSQL advisory transaction lock, and 250-recipient keyset pages. Each
page's inbox rows commit before realtime publication; disabled global
preferences are excluded. Digest content and Monday 09:00 UTC schedule remain.
No table or field was added. Core Release and standard `sync-dotnet.sh` (Core,
Afghanistan package and API builds) passed; no tests were run. Actual multi-host
execution and global-recipient query plans still require runtime evidence.


## Resume increment 112 — coordinate transfer warnings and batch stale cancellation

The stale-transfer worker materialized every final-week warning candidate,
checked recent inbox rows in memory, then notified both schools. Concurrent API
hosts could duplicate those warnings. Origin and destination reminders now use
two school-scoped Core recurring rules, each with durable per-recipient
receipts, advisory transaction locks and bounded source pages. Separate source
streams avoid losing one school when keyset pages meet two records with the
same transfer ID. Stale status transitions remain conditional and idempotent,
but now fetch and update at most 250 transfer IDs per batch. Existing transfer
rows and notification type are reused. Core Release and `sync-dotnet.sh` (Core,
Afghanistan package and API builds) passed; no tests were run. Real multi-host
behavior and representative candidate/update counts remain unverified.


## Resume increment 113 — serialize nightly backups across API hosts

The nightly backup already reused Core's bounded backup exporter, timeout,
process-local admission gate and atomic same-directory publication, but every
API host still generated each school's archive independently. The worker now
holds a per-school/day PostgreSQL session advisory lock through generation and
publication, waits up to 12 minutes for another replica, and skips a dated
archive already present after acquiring the lock. A lost lock session cancels
the export before publication. Existing archive files and retention are reused;
no distributed lock table or storage contract was added. Core Release and
`sync-dotnet.sh` (Core, Afghanistan package and API builds) passed; no tests
were run. Cross-host behavior assumes replicas share the configured working
directory for the archive-exists check; separate local filesystems still need a
shared backup destination. Real multi-host failure/recovery and archive-size
timings remain unverified.


## Resume increment 114 — record cleanup coordination and local fee query plan

The remaining cleanup workers were traced to Core's existing
`DatabaseReaper.DeleteAsync` implementation: it takes a per-table PostgreSQL
transaction advisory lock, selects at most 250 IDs, commits each delete batch,
and for side effects rechecks row metadata under row locks before publication.
No duplicate cleanup coordinator was added. A read-only
`EXPLAIN (ANALYZE, BUFFERS)` of the fee-reminder candidate page against the
configured local PostgreSQL database examined approximately 153 Fee rows,
returned none, touched 11 shared buffers, and completed in 0.314 ms. The local
database is too small and had no eligible reminder rows, so this does not
justify a new index or represent production behavior. Representative query
plans/timings remain open.


## Resume increment 115 — enforce fee balance bounds in the database

The payment audit confirmed that Core already uses the existing `Fee.PaidAmount`
as its denormalized balance, updates it in the same transaction as `Payment`,
and serializes payment, void and waiver writes with the fee row lock and durable
mutation receipt. No parallel ledger or idempotency representation was needed.
Core now declares a `Fee` check constraint requiring nonnegative invoice and
paid amounts, with paid amount no greater than invoice amount. The additive
migration installs it as `NOT VALID`, enforcing the invariant for subsequent
inserts/updates while preserving any historical anomaly for later review. A
read-only query against the configured local database found 0 invalid rows of
51; this sample is too small for production claims. The Core project builds
successfully; existing package vulnerability and compiler warnings remain. No
tests were run. Payment concurrency/replay behavior still needs its dedicated
PostgreSQL regression suite and cross-instance runtime evidence.


## Resume increment 116 — audit enrollment capacity serialization

The enrollment write-path audit traced the Core call sites rather than relying
on the helper name. Student registration and imports take the school advisory
transaction lock before `EnrollmentCapacity.Resolve`; manual enrollment,
promotion and transfer placement also resolve capacity under that lock. Class
capacity edits, timetable class edits and academic-year policy saves use the
same PostgreSQL lock key, preventing concurrent changes to a limit from racing
with seat allocation. A source search found no other production Core/country
`Enrollment` insertion path beyond those and seeding. A read-only local query
found no student/year with active placements in multiple classes, but this is
not representative deployment evidence. There is no database unique index for
one active student/year placement; a partial unique index could protect writes
that bypass Core coordination, but should only be added after checking and
resolving legacy duplicates and choosing a safe rollout for the actual table
size. No new schema was added in this audit. Concurrency/load regression and
representative production-data validation remain open.


## Resume increment 117 — export existing runtime metrics over OTLP

Core already exposes instruments for request admission, shared throttling,
notification delivery and classroom load, but the API host had no metrics
reader/exporter. The API now conditionally registers OpenTelemetry HTTP and
.NET runtime instrumentation and subscribes to those existing Core meters when
`Telemetry__Otlp__MetricsEndpoint` or `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` is
configured. It uses OTLP HTTP protobuf and rejects malformed/non-HTTP(S)
endpoints at startup. With no explicit endpoint, export remains disabled. No
Core meter, duplicate metrics source, endpoint or tenant/account metric labels
were added. The API build passed; no tests or live collector probe were run.
Deployment must configure and monitor a reachable collector to receive metrics.

The API host owns telemetry export configuration; Core continues to own the
shared meters. Package versions were checked against the current stable NuGet
packages, and the configuration follows the [official .NET OTLP exporter
guidance](https://opentelemetry.io/docs/languages/dotnet/exporters/) and
[ASP.NET Core metrics setup](https://opentelemetry.io/docs/languages/dotnet/metrics/getting-started-aspnetcore/).


## Resume increment 118 — measure database command pressure and latency

The host still had no database command measurements. EF Core 8 does not ship
the command metrics documented for EF Core 9, and the API pins Npgsql 8; Npgsql
documents its native OpenTelemetry integration as a version-9 feature. Rather
than upgrade the ORM/provider stack, Core now provides a `DbCommandInterceptor`
that records operation counts, failures, in-flight command calls and command
execution duration. It emits only a bounded SQL-verb tag and never SQL text,
tenant IDs or account IDs. The API attaches it only when OTLP metrics export is
enabled, so an unconfigured/local host has no command-interceptor measurement
overhead. For reader commands, duration ends when the provider returns its
reader; HTTP request duration remains the end-to-end signal including
materialization. Standard `sync-dotnet.sh` rebuilt Core/Afghanistan/API
successfully. No tests or live collector probe were run.

Version constraints and APIs were checked against [EF Core metrics
documentation](https://learn.microsoft.com/en-us/ef/core/logging-events-diagnostics/metrics)
and [Npgsql OpenTelemetry tracing
documentation](https://www.npgsql.org/doc/diagnostics/tracing.html).


## Resume increment 119 — review person-list query bounds and search indexes

Current Core list behavior is bounded and stable: `ReadPage` caps and orders
root identities before graph expansion; students load only the joining-class
reference; teachers use split queries and reject relation expansion above the
existing 500-row cap. Both order by school/name/ID. Student contains-search
already has a PostgreSQL trigram index from `StudentSearchIndexes`; teacher
name/email contains-search has no corresponding GIN index. Local PostgreSQL
statistics show about 517 students and 0 teachers, far too little evidence to
justify a write-amplifying teacher index or claim meaningful timing. Leave the
schema unchanged until representative teacher counts and query plans are
available. Stable paging and bounded expansion were confirmed by source trace;
production query plans and realistic search timing remain open.


## Resume increment 120 — make course creation atomic and replayable

The course-create audit found a read-before-insert duplicate check without a
transaction, school lock or idempotency receipt. Two API instances could both
create the same class/subject course, and a lost successful response left a
retry as a conflict. The Core endpoint now uses the existing durable mutation
receipt transaction and `EnrollmentCapacity` school lock, revalidates the
class/year, teacher and subject inside that transaction, and explicitly creates
the course as active with audit timestamps. The shared CourseEditor now sends
the existing account-scoped `useMutationIntent` ID through the existing
`Idempotency-Key` protocol. Timetable course updates also reject a class/subject
pair already owned by another course. No new receipt table, course field or
parallel lock was introduced. A read-only local check found 0 duplicate
class/subject pairs among 24 existing pairs. Standard `sync-dotnet.sh` passed;
SPA core/country sync and the shell production build passed with the repository's
existing lint warnings when `CI=false`. The `CI=true` build fails on existing
lint warnings across unrelated screens; the changed CourseEditor passes ESLint
in isolation. No tests were run. The cross-host behavior still needs its
PostgreSQL concurrency/replay regression run.


## Resume increment 121 — reject stale timetable course edits

Course already had a stable Core table and the editor already used Core's
`AppBaseEditor`, so no parallel course representation or custom conflict UI was
needed. Discovery confirmed that Course had no revision token; `UpdateDate` is
not a safe compare-and-swap value. Core now reuses its existing
`IRevisionedRecord` / `DataContext.AdvanceRecordRevisions` mechanism, exposes
the token in `CourseDto`, requires it on edits, and maps stale or missing
versions through the shared localized 409/428 responses. The migration
backfills a UUID for existing courses before making the token required. The
SPA Core Course model and cancellable `getCourse` read carry the version; the
existing shared conflict review presents the changed class, subject and teacher
and requires the user to reload explicitly. `sync-dotnet.sh` passed, including
the API build; `sync-spa.sh` passed; the shell production build passed with
existing lint warnings. A first build exposed an overly broad change to shared
`Base`; revision typing was narrowed to Course and the build then succeeded. No
tests were run. Database migration application and the multi-client stale-edit
flow still need runtime validation.


## Resume increment 122 — protect class and schedule editor writes

The same audit found that Core class and schedule updates serialize against
timetable operations with the existing per-school lock, but did not detect that
the form was based on an older read. Both records now implement the existing
Core `IRevisionedRecord`; their DTOs expose revisions, edit DTOs require the
expected version on updates, and the existing DataContext advances/checks those
tokens. Existing class and schedule rows receive UUIDs through a backfilling
migration. Their editors reuse `AppBaseEditor` conflict review and cancellable
Core API reads. Create requests remain version-free. `sync-dotnet.sh` passed,
including the API build; `sync-spa.sh` passed; the shell production build
passed with the repository's existing lint warnings. No tests were run. Applying
the migration to a real database and exercising simultaneous editors remain
runtime validation items.


## Resume increment 123 — reject stale branch edits

The editable Branch record was another Core-owned table whose GET/PUT flow had
no expected version. The implementation reuses `IRevisionedRecord`, the shared
DataContext token advancement, `BaseController.CheckRecordRevision`, and the
existing localized 409/428 problem responses. Branch DTOs carry the revision;
the update ignores client mapping into the entity and EF's concurrency token
catches writes racing after the explicit comparison. Existing rows are
backfilled by a single additive migration. The existing shared conflict-review
component is rendered inside the Branch Formik form and reloads the current
server value only when selected. No duplicate branch/version storage was
introduced. `sync-dotnet.sh` passed, including the API build; `sync-spa.sh`
passed; and the shell production build passed with existing lint warnings. No
tests were run. Applying the migration to a real database and exercising
simultaneous branch editors remain runtime validation items.
