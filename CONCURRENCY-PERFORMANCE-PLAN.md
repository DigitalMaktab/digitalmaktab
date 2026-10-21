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

### Person edit versions (implemented for student/teacher Core profiles)

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

Remaining full-goal work includes registration and other important mutation receipts, remaining versioned editors and explicit conflict comparison, the wider invariant/query audit, cross-instance background/rate-limit/classroom state coordination, telemetry export, and representative whole-application load testing. During the financial read audit, FinancialHealth's existing Gregorian/off-by-one expected-month calculation was identified for correction in the dashboard/calendar query phase; this increment only changes voided-payment inclusion in income aggregates.

Transaction/locking references: [PostgreSQL row and advisory locking](https://www.postgresql.org/docs/17/explicit-locking.html), [EF transactions](https://learn.microsoft.com/en-us/ef/core/saving/transactions).

- Second increment package status: final Core/SDK/country packages rebuilt and installed in the API (`/tmp/dm-payment-release-sync.log`), SPA packages rebuilt/installed (`/tmp/dm-payment-final-sync.log`). No user-owned API/SPA server was restarted. Local implementation commits: Core `923bfd0`, SPA Core `f6de619`, SPA shell `d9285db8`, API `7d77a28`, Afghanistan test fixtures `181deac`; nothing pushed.
