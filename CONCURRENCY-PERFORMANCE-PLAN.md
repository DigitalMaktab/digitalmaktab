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
