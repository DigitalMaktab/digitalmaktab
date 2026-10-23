# CLAUDE.md — Ground rules for every session on this codebase

This file collects the persistent instructions the human has given across
sessions. Every future Claude working on this repo must read this first
and follow every rule. Golden rules are non-negotiable.

## Repos on disk (multi-repo, local commits only)

Working tree is a set of sibling directories under
`/Users/dahee/Desktop/projects/`:

- `digitalmaktab/` — this monorepo stub (scripts + docs).
- `digitalmaktab-core/` — backend .NET packages
  (`DigitalMaktab.Core.Abstractions`, `DigitalMaktab.Core`,
  `DigitalMaktab.Core.SDK`). Packed as NuGet packages.
- `digitalmaktab-api/` — ASP.NET Core web host that consumes the Core
  NuGet packages.
- `digitalmaktab-country-afghanistan/` — Afghanistan backend country
  module (`DigitalMaktab.Country.Afghanistan`). TPT extensions on
  Core.Student / Core.Teacher + Ministry report generation. Packed
  as a NuGet package.
- `digitalmaktab-spa-core/` — shared React/TypeScript component library
  (`@digitalmaktab/spa-core`). Packed as an npm tarball.
- `digitalmaktab-spa-country-afghanistan/` — Afghanistan country module
  (`@digitalmaktab/spa-country-afghanistan`) with the fa-AF + ps-AF
  translation bundles and country-specific grading. Also packed as a
  tarball. Additional country packages
  (`digitalmaktab-spa-country-<name>/`) follow the same shape.
- `digitalmaktab-spa-sdk/` — thin SPA SDK layer.
- `digitalmaktab-spa/` — the shell CRA app.
- `digitalmaktab-desktop/` — Electron report generator (standalone
  app, no coupling to the API — reads exported data). Its own
  package.json + tsc.
- `digitalmaktab-docs/` — cross-repo markdown docs
  (globalization.md, MULTI-REPO.md, HOWTO-ADD-COUNTRY*.md, etc.).
  No build.
- `digitalmaktab-mobile-sdk/` — type-only extension contract for
  the React Native apps (`@digitalmaktab/mobile-sdk`). Mirror of
  the spa-sdk shape but for RN.
- `digitalmaktab-mobile-country-afghanistan/` — Afghan country
  module for the RN apps (`@digitalmaktab/mobile-country-afghanistan`):
  Solar Hijri calendar, Afghan grading, en-US + fa-AF + ps-AF
  translations, teal brand palette.
- `digitalmaktab-mobile-parent/` — React Native (Expo) parent app
  consuming `-mobile-sdk` + `-mobile-country-afghanistan`.
- `digitalmaktab-mobile-student/` — React Native (Expo) student
  app, same consumer shape as the parent app.

Repo discovery is automated — `scripts/install-hooks.sh` and
`scripts/health-check.sh` enumerate siblings matching `digitalmaktab`
or `digitalmaktab-*` with a `.git/`, so a new country package or
microservice slots in on next bootstrap with zero config edits.

**Multi-repo commit rule (GOLDEN):** commit locally in every affected
repo. Do NOT push to any remote unless the human explicitly asks — they
create GitHub remotes on their own.

## Golden rules — do not violate

1. **Extend core, don't fork.** Every new feature MUST use the
   `@digitalmaktab/spa-core` primitives and the shared Core NuGet
   modules. If the primitive you need doesn't exist, add it to
   `spa-core` first, then use it. Same on the backend — extend Core
   before writing bespoke logic in the API or a screen. Violations
   surface as inline styles + parallel markup / duplicated services;
   flag and fix on sight.

2. **Reuse existing components.** For new UI/services always extend
   `AppTable`, `AppModal`, `AppButton`, `AppCard`, `AppCheckbox`,
   `AppForm*`, `BaseController`, etc. Never render raw `<table>` /
   `<input type="checkbox">` / duplicate a repository class. If
   `AppTable`'s built-ins are missing something, extend `AppTable`.

3. **Translate everything (GOLDEN — human has asked repeatedly).**
   Every new string, on every tier, must land in all three
   supported locales:
   - Frontend base (en-US) → `digitalmaktab-spa-core/src/locales/en-US/translation.json`
   - Frontend country locales →
     `digitalmaktab-spa-country-afghanistan/src/locales/{fa-AF,ps-AF}/translation.json`
     (and any additional country modules that ship translations)
   - Mobile locales → `digitalmaktab-mobile-country-afghanistan/src/locales/{en-US,fa-AF,ps-AF}/translation.json`
     (mobile ships all three in one package — no core/country split
     like the SPA has). `check-mobile-i18n.sh` enforces coverage.
   - Backend → `Resources/Localization/Controllers/*.resx` +
     `.fa-AF.resx` + `.ps-AF.resx` per controller.
   Never leave a screen rendering a raw key like `foo.bar.label`.
   `check-i18n-parity.sh --strict` runs in pre-commit on every
   repo and refuses the commit on any gap.

4. **Per-controller / per-screen localizer.** Never dump every string
   into `MainController` on the backend. Each controller gets its own
   `IStringLocalizer<TController>` + its own `.resx` set. On the
   frontend, each screen owns its own JSON namespace under
   `translation.json`.

5. **AppTable is the only table.** No raw `<table>` in any screen —
   ever. Extend `AppTable` if it lacks a feature. Every admin table
   MUST match the `StudentList` shape: show/hide filter, row actions,
   toolbar actions, export. Tables also expose:
   - Double-click a row → opens the detail/edit view.
   - Right-click → context menu.
   Every table filter, including API scope selectors, belongs in the shared
   filter panel: use column filters or `filterControls` (draft values, Apply,
   Reset). `scopeControls` is for non-filter context/actions only. Forward all
   applied criteria to paged/export loaders; keep the table mounted on empty
   results so filters remain accessible.
   Use these where they apply. **Confirmation for destructive actions
   is mandatory** — use `AppModal` (there's a built-in confirm on
   `AppTable`'s delete flow).

6. **Loop cycles: finish carryovers first.** Every cycle starts by
   closing any half-shipped work from the previous cycle before
   touching a new feature. Never leave a feature half.

7. **Multi-repo, commit locally, don't push.** Restated because the
   human has reminded me many times.

## Module composition (countries and schools)

- Installed SPA packages export `ApplicationModule` from spa-core, extending
  the type-only spa-sdk `ModuleDefinition`. Register them in
  `digitalmaktab-spa/src/plugins/modules.ts`.
- Core's `ApplicationModuleProvider` activates modules by school country and
  school ID, then composes routes, sidebar items, editor tabs, person/table
  columns, row transformations, translations, languages, calendar and grading.
  School contributions take precedence over country contributions.
- `AppTable` supports `moduleTableKey` and module-defined table behavior. Keep
  all custom UI on Core primitives; module DTOs/domains stay in their package.
- Sidebar sections can set `group` and `order` to join a shared workflow.
  Core groups run from overview (0), daily (10), people (20), teaching (30),
  assessment (40), finance (50), communication (60), wellbeing (70), operations
  (80), tools (90), administration (100), to support (110). Country/school
  modules own their contributions and can declare their own groups and order.
  Grouping never changes route permissions; Dashboard remains first after
  role/capability filtering. Use route identities for menu state and keys,
  since translated labels can be identical.
- Backend modules extend SDK `CountryModuleBase` / `SchoolModuleBase` and
  register through `AddDigitalMaktabModule`. Core discovers their controllers,
  model configurations and mapper profiles, and enforces their country/school
  target. Module-owned records use `ModuleEntity` or `IModuleSchoolEntity` for
  tenant filtering and write protection. Background work uses a scoped
  `ModuleTenantContext` binding.
- Afghanistan is the working reference. Additional country and school packages
  follow the same contract; no lower-module implementation belongs in Core.
- Fee `Month` values are calendar-relative ordinals. Use the provider's
  `FormatMonth` (or Core `ISchoolCalendarFormatter.FormatMonthAsync`) for
  reminders; never print `Month.ToString()` or convert the ordinal as a
  Gregorian date. Afghanistan owns Solar Hijri month translations.
- Backend calendars continue to use `ICalendarProvider` +
  `ICalendarProviderResolver` in Core.Abstractions. Gregorian is in Core;
  Solar Hijri belongs to Afghanistan.
- See `digitalmaktab-docs/HOWTO-ADD-COUNTRY.md` and
  `HOWTO-ADD-COUNTRY-SPA.md` for current registration examples.

## Dev workflow — build + install ritual (READ CAREFULLY)

Because packages are consumed via **tarball install** (not `npm link`),
changes to SDK, `spa-core`, country or school packages do NOT hot-reload
into the running `npm start`. Use the automation scripts:

```bash
./scripts/sync-dotnet.sh   # Core.Abstractions + Core + Afghan .NET → API
./scripts/sync-spa.sh      # SDK + spa-core + country/school modules → SPA
./scripts/sync-all.sh      # both of the above in order
```

The scripts replay the full pack-and-swap ritual (clean+build+pack
each affected project, wipe the NuGet / npm caches those three
packages live in, swap the fresh tarballs into every consumer's
`node_modules`, clear CRA's webpack cache). They exit on first error
so a half-swap never silently lands.

**Auto-sync on `git pull`.** `scripts/install-hooks.sh` wires a
`post-merge` hook into every repo that invokes the right sync
script when a pull brings in files other repos consume. So a
`git pull` in `digitalmaktab-core` auto-runs `sync-dotnet.sh`;
a pull in `digitalmaktab-spa-core` auto-runs `sync-spa.sh`. Skip
with `SKIP_AUTO_SYNC=1 git pull` for a fast pull without the pack
cycle.

**One-command local dev**: `./scripts/dev-up.sh` starts the API,
SPA shell, and both watchers (`watch-dotnet.mjs` + `watch-spa.mjs`)
under one supervisor. Each child's output gets a `[label]` prefix
so the multiplexed stream stays legible; Ctrl+C tears every child
down cleanly (process-group kill). All-or-nothing: a child dying
on its own tears the rest down too so you never end up with 'the
watcher is dead but you still see the stale shell.'

CRITICAL (encoded in `sync-dotnet.sh`): `dotnet pack` may reuse a
stale `bin/` DLL if MSBuild's incremental cache thinks the assembly is
current — the packed nupkg then contains an OLD DLL and startup throws
`TypeLoadException` at DI registration. The script always runs
`dotnet clean -c Release && dotnet build -c Release` before each pack
to defeat this.

**Then — CRITICAL — the human must restart the dev servers.** CRA's
`react-scripts start` does not watch node_modules for JSON changes, so
the swapped translation bundles + component code stay stale in the
served webpack bundle until:

- Ctrl+C in `digitalmaktab-spa` terminal, then `npm start` again.
- Restart `dotnet watch run` in `digitalmaktab-api` for new
  Core-package DLLs to be picked up (`dotnet watch` does not detect
  transitive package DLL swaps).

Hard-refreshing the browser is NOT sufficient — the stale bundle is
in the dev server's memory, not the browser's cache. Any time a user
reports "translation not showing", "new component not appearing",
"endpoint not found", the answer is almost always: **restart
`npm start` and/or `dotnet watch run`**.

## School activation and authentication

Inactive schools must not log in. School admin authentication requires an active
school; teacher, student, parent and staff authentication requires both an active
account and an active school. Core's shared JWT validation also rejects existing
school-bound tokens while the school is inactive. Platform root accounts remain
independent of school activation. Keep the support submission activation check;
do not relax it to compensate for missing authentication enforcement.

## Dynamic school roles and staff

- `/custom-roles` and `/school-staff` use Core's shared access management screen.
  Define a role, register a staff account using its unique email, then assign
  roles by immutable IDs. Staff names need not be unique. Do not create fake
  teacher records for assistants or add each custom role to `UserRole`.
- `STAFF` is the account type; `CustomRole` and `StaffUserRole` hold dynamic
  capabilities. Core's catalog owns valid capability tokens and prerequisites.
  The editor visibly selects prerequisites and the API stores the expanded set.
- JWT validation reloads active assignments each request. Staff routes/actions
  are opt-in and unmapped API actions are denied. Root-only administration is
  excluded. Password changes/resets rotate the staff security stamp.
- Country/school packages declare SPA route/editor `capabilities` and backend
  `SchoolCapability` attributes in their own module. Keep their tenant targeting
  and DTOs there. Shared code must not import a country implementation.
- Staff use the shared forms, table/filter/export controls, profile and password
  reset components. Keep account-scoped print preferences and module selection
  working for staff as well as built-in identities.

## Platform support tickets

- Core owns `/tickets`, `/api/support-requests`, and the existing Suggestions /
  Feedback entry points. Keep all ticket filters in `AppTable`, use shared
  forms/modals, and preserve account-scoped print defaults.
- `SUPPORT_AGENT = 9` is a platform identity in `User`, with no school. Root
  manages accounts at `/support-team`. Never turn school assistants into
  support agents or give support agents root/school administration access.
- Support agents are denied by default through `SupportAgentAccessFilter`,
  including legacy `[Authorize]` actions, and cannot join classroom signaling.
  Tokens revalidate their active status/security stamp on every request.
- Ticket states are Open(0), InProgress(1), Resolved(2), Testing(3), Done(4).
  Existing legacy Closed(2) rows migrate to Done(4). A support worker claims
  and resolves work; only the immutable reporter starts testing, accepts it,
  or reopens it. School leaders can see their school's reports but cannot
  complete someone else's ticket.
- Transitions/comments take `version` plus `clientRequestId`, append immutable
  activity, and guard retries/concurrency. Do not restore the old arbitrary
  school-admin status editor or bypass the transition service.

## School automations

- Core owns `/automations`, `/api/school-automations` and the minute reminder
  sweep. New rules are disabled; preview must never save or send notifications.
- Country/school packages contribute `ISchoolAutomationSource` implementations
  with module-owned candidates, DTO/domain logic and translation keys. School
  overrides country, country overrides Core for the same stable rule key.
- Use the country-aware active academic year, effective school timezone and
  native calendar, plus recipient language. Shared calendar `FormatOptions`
  accepts `timeZone` for scheduled instants in SPA and mobile adapters.
- Enforce active school/account membership, current staff capabilities and
  notification preferences. Persist inbox rows and durable unique receipts in
  one transaction; publish only after commit. Inbox cleanup must not cause
  duplicate reminders. Keep optional rules disabled during development tests.
- Automation prepares and reminds; it never fabricates attendance, changes
  grades, confirms payments, approves admissions, promotes students or accepts
  another reporter's support ticket. See `AUTOMATION-PLAN.md` for remaining work.

## School-owned AI configuration

- Core owns `/ai-settings`, `/ai-assistant`, and `/api/school-ai`. The school
  chooses its provider, exact model ID, allowed account types, output limit,
  and daily request limits. Defaults are disabled; do not pick a model or
  activate a paid provider on a school's behalf.
- Supported adapters are OpenAI Responses, Anthropic Messages, Gemini
  GenerateContent, xAI Grok Responses, and Groq Chat Completions. Keep their fixed HTTPS origins, disabled redirects,
  bounded responses, sanitized provider errors, and server-only credentials.
  Adding a provider belongs in Core's provider gateway and validation/catalog.
- School admins configure AI; staff require `ai.configure` / `ai.use` dynamic
  capabilities, as well as the school's account-type allowlist. Configuring
  AI implies the use capability. Root and support agents have no school AI.
- Keys use ASP.NET Data Protection with a school-specific purpose. Preserve
  the key ring across releases and instances; production hosts must use Core shared Data Protection configuration
  (persistent KeyRingPath, matching KeyRingId marker, certificate or explicit
  external-storage protection; see the API README). A lost
  key ring requires schools to re-enter keys. Never return saved keys in DTOs
  or include credentials/encrypted replies in audit snapshots or backups.
- Changing provider clears its old key; removing a key requires disabling AI.
  The connection-test button tests the saved configuration, including while
  disabled, and counts as a request. Daily limits reset at midnight UTC and
  include failed attempts. Do not add automatic provider retries.
- `clientRequestId` + a payload fingerprint protect paid generations from
  duplicate submissions. Same-actor replies can be replayed for 15 minutes
  from an encrypted cache. Cleanup runs every 15 minutes, clears expired
  replies, and deletes request metadata after 30 days. Saved conversations are
  separate from that short-lived retry cache; successful turns remain replayable
  without another paid call after request metadata expires.
- `/api/school-ai/conversations` stores private histories scoped to school,
  actor ID and account role. Titles and turns use per-conversation Data Protection;
  the school admin and support team have no access to other users' histories.
  Conversation entities and AI requests/settings are excluded from school backups;
  histories and requests are excluded from audit snapshots. Users retain saved
  chats until deletion (up to 500 chats, 100 turns per chat, bounded total text).
- Saved-chat message requests send a prompt, expected conversation version and
  retry ID. Core builds bounded context from successful saved turns, persists the
  pending prompt before generation, and saves completed/failed states atomically.
  Preserve the school lock, optimistic concurrency, durable replay fingerprints,
  and delete protection during generation. Deletion clears associated reply caches.
- The shared chat offers title search, pin/rename/delete, copy/text export, safe
  Markdown, account/school boundaries, in-tab drafts and Ctrl/Command+Enter.
  Legacy `/chat` and configuration tests remain transient for compatibility.
  AI does not read school records, run tools, or mutate school data. Keep output
  escaped through React; never introduce raw HTML rendering. Preserve cancellation,
  visible errors and retry IDs; no automatic paid retries.
- Provider protocol references: [OpenAI text generation](https://developers.openai.com/api/docs/guides/text),
  [Anthropic Messages](https://platform.claude.com/docs/en/api/messages/create),
  [Gemini GenerateContent](https://ai.google.dev/api/generate-content),
  [xAI Responses](https://docs.x.ai/developers/rest-api-reference/inference/responses),
  [Groq Chat Completions](https://console.groq.com/docs/api-reference).

## Dev-only demo login accounts

Seeded automatically in Development env by `Seeder.SeedDevAccounts`.
All share password `Demo@1234`:

- ADMIN → `admin@demo.local`
- TEACHER → `teacher@demo.local`
- PARENT → `parent@demo.local`

Idempotent — skipped if the Demo School row already exists. Gated
behind `IsDevelopment()` so it cannot leak into staging/prod.

Root account (seeded from config): `root@digitalmaktab.com` with
password from the `RootUserPassword` config value.

## Commit hygiene

- One commit per affected repo per cycle.
- Commit messages: short subject explaining the "why", not the "what".
- Every commit ends with the Claude Code coauthor trailer.
- Never `git push` unless the human explicitly says so.

## When the human types `/loop`

- Fixed-interval mode: create the cron via `CronCreate` (session-only,
  auto-expires after 7 days), then execute the parsed prompt
  immediately.
- Read the loop skill instructions on first invocation — don't guess
  the schedule dance.

## Anti-patterns to flag

- Raw `<table>` / `<input type="checkbox">` / inline hex colors.
- New string that isn't in en-US + fa-AF + ps-AF.
- Direct DB access in a controller instead of a repository.
- Adding to `MainController` instead of a feature-specific controller.
- Skipping the pack + swap ritual after changing spa-core.
- Pushing to any git remote.


## Timetable and lesson-presence research (2026-10-19)

The human requested Afghan taqsim awqat, per-grade ministry subjects/books,
shifts, automatic conflict-free draft scheduling, multi-subject teachers,
approved substitutes and monthly class registers. Keep Afghan curriculum,
ministry references and print profiles in Afghanistan; shared scheduling
constraints belong in Core. A book is not necessarily a separate subject, and
a book listing is not evidence of weekly teaching-hour requirements.

The human explicitly authorizes teacher lesson-presence evidence from the
assigned authenticated teacher taking attendance, or from an approved
substitute. This is an exception to the earlier blanket no-inferred-attendance
rule for this narrowly scoped teacher workflow. Never fabricate student
attendance, handwritten signatures or whole-day teacher absence from a single
substituted lesson. Leave and substitution proposals require administrator
approval. Preserve actor, lesson, date, assignment and audit evidence.

Taraqi talim must also be printable/exportable to PDF at any time, independently
of month-end attendance exports. Preserve the selected class/date range,
Solar Hijri layout, subjects and lesson-progress/evidence records, including
incomplete periods. Correct official-format parity requires a verified template;
never synthesize handwritten signatures.


## Reuse existing timetable records (2026-10-19)

Before further timetable work, read the current schema/model audit in
`../digitalmaktab-country-afghanistan/docs/TIMETABLE-MODEL-AUDIT.md`.
Class already owns Shift, grade, branch, section and calendar year. Course already
owns the class/subject/primary-teacher assignment; Schedule owns weekly per-period
teacher assignments. Do not add parallel tables for these concepts.

Bell settings are now `SchoolAcademicYear.Plan.BellSchedules`, serialized in the
existing PlanJson with the existing academic-year Version. Reuse shared
TimetableRules and SchoolRepository's school-locked schedule/class/course write
paths. Academic-year bell edits share the same advisory school lock and validate
existing schedules. Never restore the unused unsafe ordinal-only duplicate
helpers or let a new generator bypass the shared validator.

Afghan grade curricula should first extend existing AfghanAcademicYear.PolicyJson
and reference existing Subject/Book/Course IDs. Audit before adding anything new.
Room is hostel accommodation; Progress is student learning progress; neither is
an interchangeable classroom or teaching-diary record.

## Class capacity and annual registration limits (2026-10-21)

Core owns `SchoolAcademicYear.Plan.DefaultClassCapacity` (40 by default),
`AnnualRegistrationLimit` (blank/null means unlimited), and
`AnnualRegistrationScope` (`NEW_ADMISSIONS` by default, or `ALL_ENROLLMENTS`).
The shared `/registration-capacity` page edits the current school year; Afghan
academic-year forms reuse these same Core settings. Country policies must not
introduce a separate copy of these limits.

Class owns an explicit `SectionNumber` and an optional `StudentCapacity` override.
`ClassType` remains the legacy category, not the section identity. Registration
fills a matching active grade/branch/category/shift section or creates the next
numbered section. Course schedules are not copied into overflow classes.

All registration/import/transfer/promotion enrollment writes use Core
`EnrollmentCapacity` under the same school advisory lock and transaction as the
account/enrollment changes. Check the year limit before creating a class or
student. Keep welcome emails after commit. Year counts use distinct historical
school/year enrollments; withdrawals/transfers do not reopen annual intake places.
Returning students are excluded only in NEW_ADMISSIONS mode. Keep enrollment
withdrawal history through soft deactivation; active rosters determine class seats.

The additive Core migration adds only the two Class fields and numbers existing
parallel rows without changing their IDs or enrollments. Isolated tests cover
40 seats plus a single remaining yearly place, racing HTTP registrations, imported
row rollback, promotion caps, scope/version guards and migration up/down. Shared
forms and yearly payload round-trips are tested in English, Dari and Pashto.


## Concurrency and performance hardening (2026-10-22)

The active implementation checklist/evidence is `CONCURRENCY-PERFORMANCE-PLAN.md`.
Navigation/workspace tabs are parked. Do not mark the larger performance goal
complete from a focused concurrency test or a small query microbenchmark.

Student/Teacher Core profile reads return opaque `Revision`; update DTOs must
return it unchanged. Missing versions return localized 428, stale saves 409 with
`record_edit_conflict`. Never let AutoMapper assign the revision. DataContext
advances revisions for root and owned address/phone writes. Core profile and
country extension hooks share a transaction. Keep entered form values on failure;
never silently reload or automatically retry an outdated mutation.

Core `RequestCapacity` provides bounded per-process admission before authentication,
then validated school admission after authorization; expensive work is explicitly
marked with Core `ExpensiveOperation`. Keep ordinary capacity separate, queues
bounded (currently no queue), 503 + Retry-After localized and no mutation retries.
This does not replace distributed rate-limit coordination. Health probes live at
`/health/live` and `/health/ready`; metric labels must use route templates, never
raw paths, tenant/person IDs or query strings. Never change process-wide culture
on a per-request basis; use ASP.NET request-scoped localization.

Financial mutations reuse Core `MutationReceiptStore` / `FeePaymentService`.
Keep tenant/actor/role/operation/request fingerprints and the encrypted durable
response in the same transaction as ledger, audit and inbox writes. Financial
receipt metadata is not an expiring cache: cleanup must never enable an old
payment to execute again. Exclude private receipt payloads from backups/audits.
All payment/waiver/void forms send a stable Idempotency-Key UUID per operation;
Core `useMutationIntent` pins it and the timestamp through failed submissions.
No automatic mutation retries or new IDs on the same failed form submission.

Fee balances use row locks plus reload before validation; bulk locks use stable
UUID order, with allocation in requested order and a single transaction. Payment
voids soft-deactivate existing rows, retain actor/time/history and reverse once.
Income/current-payment queries exclude voided rows. Webhooks verify the exact
buffered body and configured provider before durable session replay. Parent and
student checkout requires actual fee ownership, and currency comes from country.
For EF owned-reference replacements, deleted and newly added entries can share
an identity: revision lookups must prefer live principals, never ToDictionary
all states unconditionally. Country identity/address replacement tests cover it.


Dashboard/financial reads reuse Core repository scalar/group projections, no
tracking, cancellation and repeatable-read snapshots across multiple statements.
Use the school's calendar provider, selected school-year anchor and timezone;
month ordinals are not Gregorian dates. Core SchoolLocalTime handles local date
boundaries and midnight/date-line gaps. Parent/class aggregates must retain
explicit school scope even after student transfers. Fee class attribution uses
retained school/year enrollment history; missing history stays unassigned.
Report DTO timestamps describe the successful snapshot, never a failed refresh.

SPA read screens reuse Core useReloadableRead: one active request, abort on
unmount/account/language/resource change, no cross-account snapshots, explicit
manual retry, retain last same-scope figures on transient errors, clear on
401/403/404. Do not reintroduce effect loops or automatic mutation retries.


Student/teacher/parent registrations reuse Core AccountRegistrationService and
MutationReceiptStore. Required Idempotency-Key remains stable through failures;
original result, account, country hooks, placement/fee and welcome intent share
one transaction. Replay must happen before current capacity/reference checks;
server-selected year/context changes do not alter the client-command fingerprint.
Use normalized-email locks before school/capacity locks for these mutations.
Do not reintroduce post-commit account creation or email-gated persistence.

Core AccountWelcomeQueue owns encrypted transactional welcome delivery, short
SKIP LOCKED claims, token fencing, bounded transport/retries/expiry and terminal
payload scrubbing. Exclude its private rows from backups and audits. Never hold
DB transactions over network delivery, log provider bodies/passwords or describe
provider acceptance as exactly-once email arrival. The original result's queued
flag describes registration time; SPA uses shared AppPasswordRevealModal's
emailQueued state. Persist/share Data Protection keys when scaling instances.

Mutation intents use immutable actor/role/school scope via Core accountIdentity,
not the access token: token renewal must not create a new payment/registration
request ID. useMyId reuses the same role-nested account ID resolver. Unknown
legacy session shapes conservatively fall back to the token scope.


Parent uses Core IRevisionedRecord too. Parent admin/self-service and teacher
self-service profile DTOs echo Revision; use the shared BaseController version
problem/check helpers (428 missing, 409 stale). The aggregate tracker covers
owned-only edits; never assign client revisions to entities. Core's infrastructure
fallback handles real unhandled EF races before response start without retrying.
Do not restore parent-update field-value debug logs.

Person editors reuse AppRecordConflictReview inside Formik, preserving drafts
until explicit Keep/Load saved choice. Comparison reads are cancellable/no-store;
loading values replaces the entire form baseline and revision together, and never
saves automatically. AppBaseEditor/useFormData support explicit replacement.
AppFormSubmitButton owns pending submit state. AppModal owns nested keyboard/
scroll behavior and fixed footer actions; do not duplicate modal or form controls.
Self-service profile merges retain the current login token and reject late results
for an unmounted/changed account. Date-only reviews use Core AppCalendarDate with
UTC plus the active country's calendar adapter.


## Audit actor labels and request scope (2026-10-23)

Core UserResolver uses scalar projections and a bounded cache on DataContext so AutoMapper's transient resolver instances share names within one unit of work. Include the effective ModuleSchoolId in cache keys; reject cross-school account/school labels for bound requests, while retaining global platform actor names and authorized unbound contexts. Never cache account entities, passwords or names globally. Clear the cache on both SaveChanges paths. Parent and StaffUser are real audit identities too. The current optimization is one query per uncached distinct actor; it is not a completed batched lookup audit. PostgreSQL coverage lives in ActorNameMappingTests and the shared isolated backend harness.


## Startup database coordination (2026-10-23)

API startup wraps migrations, forward repairs and seeding in Core StartupDatabaseCoordinator. Register the same singleton as a DataContext command interceptor; the coordinator rejects missing guards, retry strategies and multiplexing. Reuse its passed DataContext for every startup write; never open another scope/connection for seeding or module initialization. It holds a session advisory lock on a dedicated non-pooled connection. A lost session is permanently fenced and fails startup even when old repair code catches a command error. Seeder failures now propagate. No listener or background service should start before the locked sequence succeeds. DatabaseStartup:LockWaitSeconds defaults to 120 (maximum 1800); timeout fails startup instead of skipping initialization. A transaction-pooling PostgreSQL proxy is incompatible with this session-lock path. This coordinates cooperating startups, not incompatible online schema changes; production still needs a controlled reviewed migration rollout. Test coverage is StartupDatabaseCoordinatorTests via the isolated Core PostgreSQL harness.


## Shared Data Protection and health routes (2026-10-23)

Core Runtime AddDigitalMaktabDataProtection owns key persistence; SchoolAiRegistration only ensures the existing DigitalMaktab application identity. Do not change that discriminator or create per-instance key stores for receipts, queued mail or school credentials. Outside Development, provision an absolute shared persistent directory and its .digitalmaktab-key-ring UUID marker, matching DataProtection:KeyRingId. Configure a currently valid private RSA wrapping certificate, or explicitly acknowledge externally protected unencrypted key XML. Keep old keys/revocations/decryption certificates while retained ciphertext needs them. Rotation requires an overlap rollout; details are in the API README. No automatic production key migration or certificate generation is authorized by these helpers. Development defaults remain compatible.

Verify DataProtectionReadinessHealthCheck before starting the API/jobs. Core MapDigitalMaktabHealthChecks is the only registration for /health/live and /health/ready; never restore the old competing MapGet handlers that bypassed dependency health. Liveness is dependency-free; readiness includes database and key storage. Report generic unhealthy responses, never exception bodies. Filesystem identity markers guard wrong/empty replacements but do not prove that mounts are shared. Framework synchronous key loading cannot promise a hard deadline on stalled OS mounts. SharedDataProtectionTests and the real two-host registration/payment fixtures cover the common configuration.


## Fee generation batching and cancellation (2026-10-23)

Reuse FeeRepository.GenerateForMonth's existing school/year/month advisory lock for all cooperating generation paths. It streams 250-line chunks and counts newly inserted fees, not SaveChanges audit totals. Repository-owned generation remains atomic across chunks; caller-owned payment/registration/transfer transactions keep their graphs. Detach only the generated fee/audit batch in an owned unit of work, never clear unrelated caller state. MonthlyFeeRollerService pages 250 SQL-filtered projected candidates with native UUID range comparison and commits per page for interruption/restart recovery. The background sweep pages 100 school IDs and disposes a separate scope per school. Forward explicit cancellation through period locks, academic-year hooks, calendar lookup and saves; shutdown must not be recorded as a job failure. The manual rollover action uses the shared expensive-operation gate. No new fee uniqueness constraint or job ledger was introduced; other writers and historical duplicate handling remain in the audit. FeeRolloverTests in the isolated Core PostgreSQL harness covers concurrency, rollback, cancellation, bounded tracking and recovery.


## Inventory write integrity (2026-10-23)

Reuse Core InventoryRepository, MutationReceiptStore and IRevisionedRecord. Inventory creation/movement POSTs require stable Idempotency-Key headers; stock deltas use current row-locked/reloaded quantities, and quantity/movement/audit/receipt commit together. Metadata updates and archive DELETE require Revision. Delete archives; preserve movement history and FK Restrict behavior. Core movement rows are immutable through SaveChanges. New check constraints enforce healthy writes while NOT VALID migration checks preserve legacy anomalies for reviewed reconciliation; never blindly overwrite balances or delete history. The API README includes read-only audit SQL and limitations.

Inventory UI uses Core forms, submit buttons, explicit conflict review, mutation intents and scoped cancellable reads. Keep pending writes visible with AppModal busy; no enabled-control dialogs must retain keyboard focus. Account changes hide old operations; late results cannot alter another account's editor. Quantities support decimals. Reuse Core theme badges and en/fa/ps translations mirrored to mobile. AuditInterceptor should be resolved through DI with IHttpContextAccessor; it accepts NameIdentifier and legacy id claims and keeps parameterless construction compatible. The source audit found no mobile inventory-write callers. List/history pagination, archive browsing/restore and historical reconciliation are not implicitly complete.


Core useReloadableRead has a separate invalidate() for reads invalidated by an accepted write: abort the prior snapshot and read again in the latest scope. Use ordinary reload() for single-flight read/retry controls. A held callback must remain safe through token renewal and become inert after unmount. Inventory uses invalidation after writes; it releases accepted-write pending state before awaiting any separate list work, so old refresh completion cannot affect a new operation's busy state. Do not replace this with automatic mutation retries or request polling.
