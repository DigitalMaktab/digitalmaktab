# CLAUDE.md — Ground rules for every session on this codebase

This file collects the persistent instructions the human has given across
sessions. Every future Claude working on this repo must read this first
and follow every rule. Golden rules are non-negotiable.

## Mandatory discovery and reuse — every agent, every session

Before implementing any change, thoroughly inspect the existing database model,
fields, tables, relationships, migrations, DTOs, services, UI components and
extension contracts across the affected sibling repositories. Trace actual
usage, not just names. Reuse what already represents the concept and extend it
compatibly when needed; do not add duplicate data, parallel code or another
source of truth. This applies equally to fixes, refactors and new features.

Shared capabilities belong in the appropriate Core layer before their consumers
use them. Country and school specializations belong in their own modules. Make
Core extensible through its composition contracts when lower modules need to
specialize shared behavior; do not fork Core in a lower module or move local
rules into Core. Before adding a new field, table, component, service or contract,
briefly document what existing options were checked, why reuse/extension is
insufficient and why the chosen layer owns the addition. Preserve existing data
and compatibility when consolidating duplicates.

These are persistent project rules for all agents and future sessions. See
[AGENTS.md](AGENTS.md) for the agent entry point and discovery checklist.

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
- `digitalmaktab-mobile-core/` — shared mobile HTTP/session/query runtime
  (`@digitalmaktab/mobile-core`), consumed as a local npm tarball. No country
  rules or native screen implementations.
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
./scripts/sync-all.sh      # backend + SPA in order
./scripts/sync-mobile.sh   # mobile SDK + Core + country/school → both Expo apps
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

Student.DateOfBirth remains the existing DateTime/timestamptz field. Its Core
DataContext value converter preserves civil calendar values and labels them UTC
for storage; never ToUniversalTime a birthday or enable global legacy timestamp
behavior to accept it. Reuse this field/mapping for all countries and writers.
Teacher/Parent birth dates already use DateOnly. Do not generalize this civil-date
conversion to payment, attendance, audit or other instant-valued timestamps.

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

Student/teacher/parent imports also stage AccountWelcomeQueue inside each row's
account transaction. Reuse AccountRegistrationService.LockEmail before school/
capacity locks and recheck duplicates after waits. Never call welcome transport
from an importer or report a committed account as skipped after mail failure.
Keep partial-row success and queue-staging rollback. Person imports now reuse
WorkbookImportReplay over MutationReceiptStore: an actual-file SHA-256 manifest
pins the original student year; independent row receipts replay outcomes and
credentials before current validation/reference/duplicate checks. Require a stable
Idempotency-Key and recheck current account/impersonator stamps and staff grants
after receipt waits. Never retry accepted rows when keys cannot decrypt results.
Use the shared Rows pipeline for aggregation/tracker cleanup and stop on transient
database failure rather than querying every remaining row.

BulkImportModal and API helpers pin account credentials, retain selected files on
close/unknown outcomes and restore IDs from bounded per-account/kind file metadata.
Never store file bytes, passwords, response data or bearer-token fallback scopes
in import recovery storage; corruption/storage failure must not silently invent
another intent. The API and SPA upload contract ship together. Grade/attendance
durable upload outcomes and atomic country import hooks remain open; do not add
duplicate account/import-job/outbox tables to solve those tasks.

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

Never add then drop the same column in recurring startup repairs. PostgreSQL
retains dropped column slots toward its 1,600-column limit. Ministry fields already
belong to AfghanStudentDetails; do not recreate them on Student. Inspect pg_class
relnatts and pg_attribute attisdropped when diagnosing this limit: a schema-only
dump/restore hides physical slot exhaustion. Explicit backed-up maintenance and
its private regression test are documented in scripts/maintenance/README.md;
never automatically rebuild live tables during startup or bypass the limit with
duplicate data models or direct system-catalog edits.

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

## Recurring school notification checkpoints (2026-10-23)

Core RecurringSchoolNotifications reuses SchoolAutomationReceipt with reserved
`system.*` rule keys. Keep inbox rows/checkpoints atomic, locks nonblocking,
PostgreSQL cadence time, bounded recipient pages and fresh contexts between
pages. Never deduplicate recurring work only against deletable inbox rows.
System recurrence is capped at 30 days; retain existing 180-day receipt cleanup.
SchoolNotificationAudience centralizes exact school/identity/role/activity,
preferences and current staff capability checks; configurable automations retain
per-candidate capability checks. The low-stock job uses 100-source/250-recipient
pages, native recipient languages and a stock row lock/recheck; school admins
are School identities, not teacher rows with ADMIN role. Realtime publication is
best effort after commit; do not claim durable/exactly-once external delivery.
Core notification/transport interfaces now carry cancellation and the shared
delivery gate bounds network work (see below). Other jobs still need the broader
coordination audit.

Assignment due-soon, accepted-admission conversion and stale grade-appeal jobs
also reuse Core RecurringSchoolNotificationSweep and feature-owned
IRecurringSchoolNotificationRule implementations. Keep bounded source/recipient
keyset pages and fresh contexts, startup catch-up/hourly retries, existing
recipient cadences and exact tenant/roster/grant checks. Recheck source status
and database time after domain row-lock waits; a pre-lock timestamp can be stale
past an assignment deadline. Do not auto-convert admissions/decide appeals.
Commit each recipient batch with its checkpoint; later-batch failure must retain
previous committed progress without duplicate inbox rows when another worker
resumes. Other legacy notification jobs still require the same audit.

The narrow Core RecurringReminderIndexes migration adds three partial source
indexes after measured PostgreSQL plans: active assignment due dates, accepted
unconverted admission decision dates, and pending appeal proposal dates. Keep
the predicate enum ordinals aligned with Core enums, runtime metadata and the
snapshot. No history is rewritten. Normal index creation needs the existing
controlled schema rollout on large databases; warm source-query microbenchmarks
are not whole-application capacity evidence.


## Bounded notification transports (2026-10-23)

Core NotificationDeliveryGate is a singleton per host, configured through
AddNotificationDelivery. It admits at most eight network operations by default,
with no waiting queue, a ten-second per-channel deadline, and a thirty-second
overall single/fan-out publication budget. Never put EF work inside its callbacks;
transport providers must use asynchronous IO and honor cancellation. A provider
which ignores cancellation retains its slot until its task truly finishes,
preventing unlimited abandoned tasks. Timed-out best-effort publication must
never undo a committed inbox/receipt or trigger automatic mutation/send retries.
Provider acceptance is not exactly-once external delivery. Keep low-cardinality
metrics and rate-limited, payload-free transport warnings. No-op transports log
counts only, never phones/tokens/message bodies.

NotificationService uses sequential fan-out and 100-device UUID keyset pages,
with exact school/user/role/activity scope for devices and role-specific scoped
phone projections. Default HTTP calls inherit request cancellation; hosted/payment
post-commit calls pass explicit tokens. StageMany still returns its full legacy
list and membership/inbox/SignalR namespaces still require the wider boundary
audit; do not claim those completed from transport tests. The narrow
NotificationDeviceLookupIndex migration adds only the partial active-recipient
index after actual before/after query plans; preserve device history and use the
existing controlled schema rollout on large tables. Country tests implement the
same Core cancellation contracts; do not fork country transport abstractions.

Legacy backup/birthday/password/digest/leave/transfer callers forward their shutdown
token. FeeReminderService accepts a token for its existing reads/saves/fan-out;
its bulk cadence transaction redesign remains open. Afghanistan ministry
readiness uses Core StageMany, commits/disposes its transaction, then calls
PublishPersisted. Keep network IO outside that transaction and retain the
independent-connection publication visibility test. A caller owning a transaction
must use staging and publish after commit; transport budgets do not establish
that boundary on its behalf.


## Notification account scopes and lifecycle (2026-10-23)

Use Core NotificationAccount (school, immutable ID, actual role) for inbox,
preferences, device ownership and message participation. Never restore bare-ID
repository overloads or GUID-only SignalR groups. NotificationRealtime owns the
versioned groups and delivery gate; publishers recheck active membership. The
hub joins only its own authenticated identity and closes at ticket expiry.
Global token/stamp revocation and distributed routing remain separate work.

NotificationAccountScope preserves original preference rows as inactive history
and creates canonical null-school platform preferences, choosing opt-out on
legacy conflicts. Active school/platform unique indexes and the scope check
must agree with runtime metadata. Down refuses null-school history; use a
reviewed rollout/rollback and stop old API writers. Never delete/remap history
to satisfy the old required FK. SchoolNotificationAudience checks only requested
role tables; StageMany still has its legacy materialized return contract.

Notification paging uses one repeatable-read snapshot for rows, total and unread;
keep X-Notification-Unread-Count exposed to browser clients. Bulk read/delete
operations stay set-based and scoped. Preference writes merge category patches
under the Core advisory lock and reload cached tracked rows. Notification labels
use NotificationController resources in English/Dari/Pashto, not static localizers.

SPA Core useNotificationHub shares one connection per immutable account, with
bounded event deduplication/reconnect and latest callbacks/tokens. Reuse Core
useReloadableRead for inbox reads and pin accepted writes' original token via
ApiRequestOptions. Full account changes remount private AuthProvider children;
same-account token renewal preserves drafts. No automatic mutation retries.
The notification lifecycle regression is part of check-pdf-exports.cjs.

Private PostgreSQL harnesses source isolated-postgres-cleanup.sh immediately
after mktemp, before initdb. Preserve bounded failure logs and original exit
status; verify shutdown before removing only the owned private directory.
Never clean up live/user databases or delete an unverified private cluster.


## Shared account stamps and HTTP sessions (2026-10-23)

All six account models implement ISecurityStampedAccount. School/Teacher/Student/
Parent reuse the existing User/StaffUser stamp pattern. Core DataContext advances
stamps in its existing tracked-change pass on actual password hash/salt, Status,
SchoolId or UserRole changes; metadata edits preserve sessions. Both sync/async
SaveChanges are covered. SQL/ExecuteUpdate bypasses must rotate stamps explicitly.
Never map stamps from public edit DTOs or use record Revision as a login stamp.

SchoolTokenValidation validates every current account/role/school/stamp, including
root. Platform users require Guid.Empty school. Staff grants stay current and
strictly tenant-bound; use scalar/projection reads, no cross-request validity cache.
AuthService passes its password-verified entity's stamp and awaits TokenService.
TokenService rejects changed snapshots before minting. Keep the existing claim
name for compatibility; old school/root tokens without stamps must sign in again.
Impersonation validates both target and original root stamp; don't silently read a
new root stamp after the authenticating principal's credential changed. Leader
password paths use actual PRINCIPAL/HEAD_MASTER roles and exact-role queries.

SchoolAccountSecurityStamps preserves existing credentials/history and backfills
four existing tables. Stop old writers during the coordinated rollout; restart
API and require new login. No country identity fork. Open SignalR/push sessions
still need a separate stamp-bound revocation audit; HTTP checks alone do not
remove an existing connection from its groups. Reset-token consumption races
also remain separate work.

The session-stamp migration also initializes legacy empty User/StaffUser stamps
(the earlier platform migration used Guid.Empty for existing users). Preserve
valid stamps; never rotate every platform account blindly during startup.

SPA Core protected-401 handling uses SESSION_INVALID_EVENT and the existing
AuthProvider/AuthRoute flow. Both producer and consumer check the exact current
token. Never let delayed old-token failures log out a newer login, and leave
failed /auth submissions as ordinary form errors. Keep cancellation guards and
original-account tokens; do not auto-retry rejected writes.


## Stamp-bound notification routing (2026-10-23)

Use NotificationRealtime for notification/message hub events. GroupFor requires
an account stamp and produces version-3 addresses; never restore version-2 or
bare-ID fallback. Subscribe verifies current account and impersonator stamps;
stale subscriptions abort. Old sockets are excluded from new publication rather
than polled individually. Already-queued frames cannot be recalled; idle stale
connections can remain open until invocation, expiry or disconnect.

Impersonation joins only the target+root stamp address. Publishers derive active
root addresses in 100-row native UUID pages and bounded group batches under the
shared delivery gate/publication budget. Reuse AccountSessionState's root check
for both HTTP and hub paths. All API hosts must ship together and browser hub
connections must reconnect after the group-version rollout. This is independent
of, and does not replace, the still-required shared backplane/classroom audit.

NotificationRootRouteIndex is a measured partial active-root User(Id) index;
keep enum ordinals/predicate/runtime/snapshot aligned and preserve users/stamps.
Use controlled DDL rollout on large tables. Message events and MESSAGE inbox
staging/publication require a staff recipient's current expanded messages.send
capability via SchoolNotificationAudience. General system notices stay available.
Push-device ownership/stamp handling and classroom revocation remain separate.


## Push-device binding integrity (2026-10-23)

Use Core IDeviceTokenRepository for registration/unregistration. It owns the clean
transaction and shared fingerprint lock, then rechecks the exact account/stamp.
Only one active binding per SHA-256 token fingerprint is allowed globally; repeat
same-owner registration reuses the row, while replacement/unregister archives
history. Never index raw multi-KB tokens or let an old logout delete a new owner.
DeviceTokenAccountBinding archives unverified legacy bindings, preserving IDs and
token/owner values; SDKs must register again. Downgrade does not reactivate them.

Push reads require current account stamps on each bounded device page. Keep
network IO outside binding transactions; provider-queued/in-flight messages cannot
be recalled. Audit snapshots must never contain Token, TokenFingerprint or
AccountSecurityStamp. The binding migration redacts old DeviceToken snapshots,
retains metadata/nonsecret JSON, clears malformed snapshots and keeps other entity
audits intact. Redaction remains after downgrade. Existing retention still applies.

DELETE /api/push/register-device accepts optional JSON token bodies plus legacy
query compatibility. The shared SPA API uses the body and captures the original
login synchronously, with cancellation/options; no automatic retry or ownership
from client DTOs. Keep the 8,000-character token / 64 KiB body limits and reject
unknown platforms, null characters and conflicting body/query values.

Core private PostgreSQL test strings disable pooling, and unrelated xUnit classes
are capped at four; races within tests remain concurrent. Do not increase the
production database limit to fix idle per-test-database pools. Explicit provider
configuration rejection tests must still construct valid provider inputs first.


## Atomic credential recovery and self-service (2026-10-23)

Use IPasswordResetRepository.Confirm/Change; never split VerifyPassword,
SetPassword and token consumption in an endpoint. Core owns a clean transaction,
locks the physical account row, reloads current credentials/stamp after waiting,
uses database time for expiry, and commits credential/version/stamp updates and
sibling invalidation together. No notification/provider IO belongs in that lock.
Legacy updatePassword routes reuse BaseController.ChangePasswordAtomic and keep
immutable ID/role/school identity even when an email claim is stale. ResolveByEmail
returns the existing Session snapshot with current scope/stamp; no tuple-only or
email-only write lookup. Keep cancellation and existing localized response shapes.

PasswordResetAccountBinding retains old hashes/IDs/timestamps but retires unbound
links; request a new link after rollout. The unique bound-hash index also covers
consumed new records. Do not edit existing reset authorization/expiry fields or
reactivate legacy links on downgrade. Token records are excluded from generic
audit snapshots. Existing notification URLs can contain recovery links; no claim
of encrypted outbox delivery or DB-wide token secrecy follows from hash storage.
Notices require the real account school and actual role, including leaders.

Normalized login-email changes also rotate account stamps. Case/whitespace-only
normalization and ordinary names/addresses preserve sessions. This supersedes
older profile-field wording. Keep temporary admin reset intent/replay and recovery
transport/privacy as explicit remaining work; atomic self-service does not finish
those separate flows.

## Shared pre-authentication quotas (2026-10-23)

Use Core SharedThrottleStore and AddDigitalMaktabSharedRateLimits for login/reset
and existing AspNetCoreRateLimit endpoint policies. Never restore process-local
counter dictionaries or allow-on-error fallback. Request ingress must precede
SQL rate limiting, which precedes authentication; matched /api endpoints only.
Trust RemoteIpAddress after configured ForwardedHeaders, never raw client IP or
client-ID whitelist headers. Keep purpose-separated HMAC keys and exclude the
infrastructure models from audit snapshots.

SharedRequestThrottles adds bounded ephemeral infrastructure only. Default maximum
is 100,000 buckets; change both the database capacity row and all host options
under a coordinated rollout. Cleanup deletes at most 500 expired rows, never live
quotas. Existing counter updates avoid the allocation lock. Preserve database-time
windows, two-second default operation deadlines, caller cancellation and localized
no-store 503/Retry-After on failure. Successful login clears email failures only;
IP failures survive, locked attempts do not extend lockout, and only crossing the
email threshold emits the owner notice. Completed-failure counters do not revoke
already-admitted authentication attempts. Signing-key rotation changes HMAC
namespaces. Shared quotas do not distribute request concurrency or hub routing.

## Classroom invocation scope (2026-10-24)

ClassHubAccessFilter replaces the former staff-only filter. Register it through
AddSchoolAccessManagement and retain current account/stamp/impersonator checks for
all classroom calls. Course rooms require school-scoped course/class membership;
students must have an active enrollment and cannot claim HOST. Teacher host access
uses existing course/schedule assignments, with school leaders/admins permitted.
Staff keep messages.send and direct-call-only access. Never trust a client HOST
string or send WebRTC payloads to unrelated connection IDs.

Legacy direct IDs omit school/role; reject globally ambiguous role-table GUIDs.
Do not relax this to enable collisions; introduce a coordinated typed wire
contract instead. Participant replacement, kicks and poll identity use school +
actual role + immutable ID. Replace both participant entry and group membership.
Close classroom sockets at authentication expiry. These incoming-call checks do
not yet remove idle revoked recipients from future group publication or make
static room dictionaries distributed/bounded. Keep those remaining tasks explicit.

## Classroom recipient publication (2026-10-24)

ClassHubAccessFilter wraps invocation and lifecycle Clients with ClassroomDelivery.
Never add a raw ClassHub IHubContext publisher or global/user broadcast bypass.
Actual connection snapshots are checked in batches of at most 100 against current
account/school/stamp/roster/teacher/staff grants, including impersonator stamp.
No checked audience means no send; lookup failure/overload must never fall back
to unchecked groups. Connection and publication admission is bounded, configured
through ClassroomDelivery options. Keep database work outside NotificationDeliveryGate
callbacks and preserve its independent classroom pool and cancellation behavior.

The bounded routing registry is not shared classroom storage. Legacy content,
room lifecycle and backplane work remain; idle revoked recipients are excluded
at later delivery checks, while already-queued/in-flight frames cannot be recalled.
Keep per-method budgets, tenant fairness, history limits and stale-room cleanup as
explicit follow-up work. No production capacity claim follows from 102 test peers.

## Classroom method capacity (2026-10-24)

ClassroomInvocations bounds whole method calls before DB authorization, default
32 globally/eight per school per process, with no queue. Remove idle partitions;
never create an unbounded per-school cache. A capacity partition from signed
claims is not authorization. Keep current stamp/room checks after admission.

One OperationTimeoutMs budget spans authorization, all sends and group operations.
Do not reset a deadline on each send or release a method lease while its body is
still running. Keep cooperative cancellation and localized Busy errors for
capacity/deadline/authorization-store failures, without provider details or automatic retry.
Timed-out ephemeral state changes are not guaranteed rolled back. Method limits
are independent of HTTP request limits and do not implement a distributed fair
scheduler or handshake admission.

## Classroom state and history budgets (2026-10-24)

ClassroomState owns the existing 14 maps per API host. Never restore mutable
static dictionaries on ClassHub or use same-process sharing as scale-out evidence.
Read digitalmaktab-core/docs/CLASSROOM-STATE-AUDIT.md before adding room state.
No new course/teacher/enrollment table is needed for ephemeral classroom content.

Chat retention has item and byte caps; eviction removes its reactions and pins.
Only retained message IDs can be pinned/reacted to. Stable contributor keys and
aggregate reaction charging must survive display-name changes without extra keys.
Whiteboard append/update checks both byte/count limits before mutation; undo and
clear release charges. Preserve chat -> pin lock ordering, localized errors and
network IO outside state monitors. These budgets are not exact heap/room-count
bounds; total room lifecycle, client render limits and shared state remain open.

SPA Core's classroom connection binds JWT renewal to the same account/session,
supplies culture, guards old callbacks, reports errors and never retries writes.
Keep explicit disposal/media ownership and retain rejected chat drafts. Do not
clear bootstrap state after JoinClass completes or drop content-limit errors.


## Classroom retained-session lifecycle (2026-10-24)

Core ClassroomState owns root generations and an async operation gate per family.
Count reserved children toward both global/per-school room quotas before assigning
attendees. Recheck closure/draining/child reservation after waiting; recheck DB
authority too. Cross-root switches acquire gates in stable root order. Keep network
and DB awaits outside short state monitors. Never dispose a gate under waiters or
release admission while a noncooperating body is still running.

Parent end clears all 14 maps for parent and children and notifies pending users;
breakout end frees only children. Safe LeaveClass removes only the caller's bound
membership even after revocation. Connection room bindings include generation;
abort cleanup rechecks the current room as well as its epoch under binding sync.
Keep Find lock-free: state lifecycle membership checks must not invert that lock.

Defaults: 64 retained physical rooms/16 per school, five-minute empty retention,
12-hour hard age. Lazy cleanup and a host-local 30-second health-tracked worker
retire sessions, preserving in-use graphs until their operations settle. These are
local ephemeral limits, not shared routing or exact heap/load guarantees. Browser
ClassroomSession markers reset old content before new room/generation bootstrap.
Shared backplane/state, voter limits and client live-history bounds remain open.


## Notification backplane (2026-10-24)

Core AddNotificationBackplane configures Microsoft's Redis lifetime manager only
for NotificationHub when NotificationBackplane:Enabled is true. Local/default
mode requires no Redis. A backplane must never silently turn classroom-local
state into distributed authority. ClassHub keeps the default lifetime manager
until shared state/routing is implemented and verified.

Require an explicit deployment channel prefix (same across replicas; different
across environments), validated endpoint and bounded timeouts. One multiplexer
is shared with readiness; disconnected backlog is fail-fast. No local fallback
or automatic mutation/event replay. Keep current account/root stamp, tenant/role
and staff-capability destination checks. Redis pub/sub loss does not erase the
persisted inbox, but this feature is not a durable delivery outbox.

Readiness includes enabled Redis and returns no provider details. Test real
cross-host delivery, isolation, stamp revocation, unsubscribe, publisher restart,
initial unavailability and recovery. The private PostgreSQL harness also requires
redis-server; each test owns a socket-only, persistence-free process. Stop only
that Process handle and verify it exited before removing its owned directory.
No production Redis service is enabled/provisioned by the tests or package swap.


## Academic record writer coordination (2026-10-24)

Read digitalmaktab-core/docs/ACADEMIC-RECORD-WRITES.md before changing grade or
attendance writes. GradeWriteService is the shared form/workbook cell writer;
appeals use the same transaction-scoped natural key locks. Order actual signed
lock hashes, recheck current provenance after waits and reject ambiguous legacy
records rather than picking a winner. GradeCellLookup is non-unique and preserves
history; never describe it as database-enforced uniqueness.

Form batches stage new-grade inbox records through existing StageMany in their
transaction; publish only after commit. Workbook rows retain independent success,
forward cancellation and clear rolled-back tracked changes before another row.
Do not expose provider exception text. Appeal decisions lock the pending row and
grade, use actual course teacher authority, and commit score plus decision once.

Serialization does not replace durable mutation intent. Grade/appeal expected
versions and Core conflict comparison now exist; retain both. Existing-cell
writes require observed tokens, decisions require appeal plus grade versions,
and review only replaces drafts after explicit confirmation. Template versions
travel in a hidden column; old sheets cannot overwrite existing marks. Deploy
AcademicRecordRevisions with all API/SPA consumers and retire old writers.

Attendance writers now reuse DailyAttendanceWriter and invariant enrollment/day
locks. Manual commands require civil Date; import ownership is active homeroom,
Asas lookup must be unambiguous, and workbook rows own their transaction. Lesson
writes take school then daily locks and preserve existing daily marks. Explicit
fill uses 200-row checkpoints and current operator grants; empty unattended actors
remain no-op. Use SchoolLocalTime, never DateTime.Date or UTC ISO slicing to infer
a school's day. Attendance now uses IRevisionedRecord, RecordVersions and the existing durable
MutationReceiptStore for manual batches. Require CalendarYearId/Date plus the
Idempotency-Key header and preserve expected tokens through retries. Check
homeroom authority after receipt waits even for replay. Core offline snapshots,
review and intent IDs are shared; background acknowledgements never reset newer
form drafts. Fresh workbook templates hide versions; examples stay on Reference.
All five workbook adapters now use the shared bounded loader and durable
manifest/row receipts; explicit fill-action recovery is described below; through-commit
reference/timezone/lifecycle coordination remains unfinished.
Do not infer complete concurrency protection or throughput from cell-race tests.

Core's pre-commit hook rebuilds Release. After committing Core, sync the committed
source before the final installed-DLL checksum check: a hook rebuild can change
build provenance metadata even when executable source is unchanged.


## Bounded uploaded workbooks (2026-10-24)

Every uploaded workbook uses Core BoundedWorkbook.LoadAsync before importer domain
queries/writes. Never restore new XLWorkbook(fileStream) in an upload path. Keep
8 MiB ingress/actual-byte limits, actual expansion and central-directory checks,
structural/decoded-text budgets and data-only/no-formula policy. See Core
WORKBOOK-IMPORT-LIMITS.md for limits and remaining scope. Source streams stay caller
owned; importer disposes the returned workbook. Constructor CPU is synchronous:
keep admission until it finishes, never orphan it through Task.Run timeouts.

Use BaseController.ImportWorkbook for localized no-store parse problems; Parent
passes its own localizer instead of legacy Main. Do not return provider messages
in per-row failures. Keep cancellation escapes and clear failed tracked changes.
This does not supply whole-upload receipts, registration/welcome effect recovery,
complete output/query bounds or production capacity evidence.


## Durable academic workbook recovery (2026-10-25)

All five workbook endpoints require Idempotency-Key. Reuse WorkbookImportReplay,
MutationReceiptStore and the existing versioned mark writers; never introduce a
parallel import-job or mark table. Grade imports explicitly join the receipt's
transaction; normal form batches retain clean transaction ownership. The accepted
mark and encrypted row receipt must commit together. Receipt storage failure rolls
that row back; preceding committed rows survive. Expected writer conflicts roll
back/report a skip; validation results returned by callbacks are recorded.

Successful academic row receipts retain the actual immutable mark ID in existing
ImportResultDto's internal provenance, omitted from aggregate HTTP reports. The
shared typed replay authorizer checks current ownership of that original record,
school and pinned year before returning a saved outcome. Do not infer ownership
from mutable Asas numbers or reapply an old choice over later form corrections.
Account/stamp/impersonator/staff checks still precede receipt decryption. These
checks do not coordinate every unrelated reference writer through commit.

Core's import modal may start a fresh same-file intent only after a known result
and explicit action. Persist the new ID before clearing that result; the action
never uploads automatically. Unknown responses keep the original request ID.
Preserve metadata-only storage, account isolation, cancellation and no automatic
mutation retries. Country import composition and explicit fill recovery remain
open; see Core WORKBOOK-IMPORT-LIMITS.md and CONCURRENCY-PERFORMANCE-PLAN.md.


## Atomic country/school person imports (2026-10-25)

Extend the existing IStudentExtensionHook/ITeacherExtensionHook through Core
IPersonExtensionHook; do not create another import registry or profile store.
Hooks contribute machine columns/reference choices, optional legacy normalization
and AfterImportAsync. Core ModuleApplicability.PersonHooks owns matching country,
exact school and enabled-module selection, with school hooks after country hooks.
Use that shared selection for ordinary form hooks too. Replay must not rerun
accepted row hooks. Core templates contain universal names and Core fields only;
module-only columns belong in that module. Reject repeated/unsupported columns
rather than silently dropping data. Teacher templates are school-aware async reads.

Afghanistan reuses its existing person DTOs, AfghanPersonDetailsRules and
AfghanPersonDetailsRepository. Import calls explicitly join the row receipt's
transaction; normal form calls still own their transaction. Country profile,
account, enrollment, welcome intent and receipt commit together. Return localized
field errors from module rules and roll the entire failed row back. IDs/school/role
come from server context; DTO identifier columns are never import targets. Preserve
explicit universal names; only the Afghan hook supplies the old English/native
fallback. Do not reinstate mandatory Afghan name columns in Core.

BoundedWorkbook.CellText normalizes typed Excel date/numeric cells to invariant
machine values. Person birth-date text uses Gregorian yyyy-MM-dd, without timezone
conversion; the country UI still owns its native picker. Imported welcome delivery
must retain the actual TEACHER/PRINCIPAL/HEAD_MASTER role. Student template class
references are deterministic/no-tracking and capped at 1,000, with localized 413;
class scoping and the broader import lookup audit remain open. Standalone country
profile editor versions and through-commit reference/permission coordination are
separate remaining work, not covered by these atomic import transactions.


## Shared versions for module profiles (2026-10-25)

Core IRevisionedExtension links a module-owned profile to its existing tracked
IRevisionedRecord through RevisionOwner. Core SaveChanges follows owned fields
into that extension and advances the Core aggregate's existing Revision. Do not
add a parallel country revision field/table. Load the owner in the same unit of
work; unbound extension writes fail. Metadata edits preserve security stamps.
The shared owner lookup is lazy so unrelated Core writes do not allocate it.

Afghan profile GET returns the Core version even for a missing profile; PUT
requires it and rechecks fresh school/version after RecordVersions.LockAccount.
That helper reuses the former password-repository physical row lock and is not
authorization. Preserve existing profile IDs: legacy Id can differ from StudentId
or TeacherId. Refresh only the clean matching profile/owned graph by its actual
FK; never discard pending Core edits or unrelated enrollment changes. Profile and
parent revision commit together. Create-only upsert/backfill hooks share the
account lock, recheck existence and leave existing profiles/versions untouched.
Backfill routes use heavy admission and hook IO forwards cancellation. Import
versions come from the server's new account; Revision is not a workbook column.

Country editors reuse Core useVersionedRecordEditor and AppBaseEditor conflict
review/acknowledgedRevision. Preserve drafts on failure, locale/token renewal and
review-read failure. Use saved values only after explicit comparison confirmation.
A known save advances only the token, preserving fields typed during the request;
failed/unknown responses do not refresh it. Account/resource switches abort and
suppress old outcomes. Pin request credentials with accountRequestConfig. Native
date/enum comparison uses country formatting. There is no automatic write retry,
silent rebase, tab workspace or new persisted draft store.

Deploy Core.Abstractions/Core/country/SPA packages together and restart API/SPA.
The standalone Afghan person profile version gap is covered; remaining aggregate
reference/authorization coordination and the wider editor/load audit stay open.


## Explicit attendance fill recovery (2026-10-25)

AttendanceAutoMarkService.FillMissingAsync reuses MutationReceiptStore and
DailyAttendanceWriter. Never introduce another job/roster/attendance table.
An explicit operator and stable Idempotency-Key are required; classId is optional
and fingerprinted. Atomically accept the original year, school-local day/UTC
bounds/settings identity and currently unmarked active enrollment IDs. Snapshot
selections are temporary encrypted 200-ID subordinate receipts; each checkpoint
commits marks plus its durable count. New registrations never join that intent.

After completion prune only temporary selections. Retain manifest/count receipts
so later retry cannot overwrite corrected/deleted marks. Batched completed-part
reads must follow verified parent scope/fingerprint and current authorization;
a caller racing selection pruning recovers the retained checkpoint. Missing
recovery state fails closed, never reconstructs a new roster/day. Current stamps,
impersonator and grants apply on replay; pending work also checks roster, holiday,
settings identity, lifecycle and timezone after waits. These are not coordination
with all unrelated reference/permission changes through commit.

AttendanceFill options bound selected missing targets (default/max 50,000) and
one cooperative action budget (default 30 seconds). Keep heavy admission separate.
Cancellation rolls back only its current checkpoint; accepted earlier work remains
recoverable. No automatic write retry/background continuation/unattended presence
inference. Empty legacy actors remain no-op; nonempty callers use the durable API.
SPA helper pins account credentials and forwards caller-owned intent. No new UI
action, control or schema is added. Cleanup after crash-before-prune/abandoned
partial intents, remaining reader bounds and representative load remain open.


## Bounded standalone attendance summaries (2026-10-25)

Reuse AttendanceRepository.Summary and AppAttendanceSummary.source for the three
standalone attendance viewers. SQL counts original filtered marks by student,
then returns a bounded page plus at most 30 recent marks per student. Preserve
absence and inactive historical enrollment semantics; do not infer unmarked
attendance or silently deduplicate conflicting history. Creation filters apply
before aggregation to original mark CreationDate, never synthetic summary rows.
Mine ignores foreign student IDs; parent link/current school membership is SQL
bound. Scope both class and student school plus class/enrollment year. Count,
page, recent rows and school timezone share one repeatable-read snapshot.

AppTable.serverSort opts into global server sorting with sortBy/sortOrder and
page-one reset. Repositories must whitelist keys and end ties with immutable IDs.
Never re-sort an accepted server page locally, inject sort metadata into filter
badges, or enable this flag on a loader that ignores it. GeneralParams only
exposes the optional keys; existing repositories/tables retain their behavior.
Summary precise rates sort before display rounding. Recent date-only values are
formatted with UTC plus the active country's calendar to preserve school dates.

The server source pins credentials, passes cancellation/no-store and uses the
existing table filter lifecycle. Keep local report-card/class-overview array
callers compatible without acquiring an HTTP loader provider. No new stored
fields, summary table, UI controls, translations or overlapping index are needed.
The existing IX_Attendance_DailyLookup is used in private query plans. Legacy raw
attendance routes/report/mobile inputs and representative multi-school load
remain open; bounded summary pages do not prove the full read audit complete.


## Existing Admin Actions attendance caller (2026-10-25)

The earlier attendance caller audit missed school.autoPresentToday and the
existing AdminActions screen. The school helper now aliases the one durable
attendance.fillMissingToday transport and requires the original caller UUID.
Never restore a second POST implementation or generate an ID in a transport
helper. AppAttendanceFillAction moves the existing control into Core and
composes AppCard/AppButton/AppModal/AppAlert with useMutationIntent; no generic
form/version editor fits this acknowledgement-only operation. Keep one ref-gated
request, credential capture, aborts and actor-scoped late-result suppression.

Verify actual presence before confirming. Busy modal actions cannot dismiss an
in-flight action. Failure/malformed replies retain the ID through modal closure
and locale/token renewal; require valid original date/year/count fields before
acknowledging. Show original date with the country calendar/UTC civil-date
formatting. Only a known result plus explicit new-run confirmation resets the
intent. This is mounted-action recovery, not persistent cross-reload storage or
automatic retry. Remove stale claims about unattended nightly marking in all
three SPA/mobile locale bundles. Promotion/fee buttons remain separate audit work.


## Paged raw attendance and optional dates (2026-10-25)

AttendanceRepository.Page reuses PagedList/AttendanceDto for raw mine/children/
school and teacher/student reads. Keep one FilteredMarks query shared with the
summary, checking both student/class schools and class/enrollment years. Parent
StudentId narrows only within the current active parent link; mine forces its
own identity. Preserve inactive historical enrollment and absence records.
Optional DateTime is a civil day resolved through existing school timezone
bounds, combined with original creation timestamps and other scope filters.

Count/page use one repeatable-read snapshot, cancellation/no-store and stable
timestamp/ID order. Include only reference navigations on at most 50 roots;
raw record shape/country enrichment remains. Clear foreign-school branch details
from no-tracking response copies without hiding marks or modifying history.
The unused unbounded ListForSchool
method is removed; report-card/class-overview full-history methods remain for
their separate audit. No new table, persistent field, DTO or index is needed.

AttendanceParams.DateTime is nullable. Never map omission to DateTime.MinValue:
student attendance without a date must return a bounded year page. Explicit
invalid dates use AttendanceController resources, including student actions.
GeneralParams clamps sizes to 1–50. PagedList calculates offsets as long and
skips item SQL beyond the counted set, retaining empty-page/header semantics.
Do not infer all repositories have snapshot/order guarantees from that helper.

SPA raw helpers/useAttendanceViews forward one page plus filters/signal/pinned
credentials and retain metadata; standalone summaries use /summary. Mobile consumers now use the shared summary reader described below. Do not
claim complete historical browsing from the raw-route or summary fixes.


## Shared mobile session runtime (2026-10-26)

Use @digitalmaktab/mobile-core for shared parent/student HTTP, auth coordination,
existing SecureStore keys and private React Query lifecycle. The SDK remains
contracts only; calendar/localization remain country-owned. Do not copy another
HTTP client, session model or credential store into a host/country module.
Role parsing, environment URL and native storage are host adapters. Requests pin
credentials at invocation, cancel on token changes, reject stale results/401s,
and bound concurrent transport and JSON traversal. No automatic write retries.

Keep hydration/login/logout epochs distinct from API session generations; serialize
physical storage changes and never publish an old accepted login over a newer
attempt. Login pending state belongs to that coordinated store. Local JWT payload
binding only detects torn ID/role/school pairs; backend authentication remains
authoritative. Existing two-key native storage is not crash atomic and erasure can
fail. Query providers replace and clear clients for each opaque runtime/token
scope. Read hooks must consume Query's signal, not merely discard responses.

Use scripts/sync-mobile.sh after mobile package changes, and restart Metro. Local
same-version tarball integrity must match the artifact installed in each consumer.
Dependency metadata changes still require npm install. Precommit and health checks
exercise scripts/tests/mobile-runtime.cjs against Core and both actual adapters.
Tests use controlled native/HTTP adapters and real React Query, not live devices.
SignalR races, locale/country scoping and accurate bounded mobile attendance screens
remain separate work; this foundation is not the completed concurrency goal.


## Mobile recorded attendance summaries (2026-10-26)

Mobile Core owns useMobileAttendanceSummary/readMobileAttendanceSummary and the
wire projection of the existing backend AttendanceSummaryDto. No attendance table
or parallel server aggregate is added. Parent/student hooks reuse this reader;
remove unused copied raw readers rather than leaving two implementations. Counts
come from server totals for recorded marks in the selected year, never a loaded
page length. Absences stay false. Do not infer presence/absence for missing days.

Read one page per action: mine one student, children ten students, at most thirty
recent marks each. Validate server pagination/row/date/status shape and forward
cancellation. Parent screens use server studentLabel instead of separately loading
legacy English/native person fields. Keep recent excerpts explicitly labelled;
this is not a complete historical mark browser. Use the existing native app
components/theme/RTL contexts. New labels live in all three mobile country bundles.

formatMobileAttendanceDay passes a server-resolved civil day at UTC to the active
country formatter. Its Core fallback explicitly selects Gregorian independently
of interface language. Never use the device timezone or locale calendar default
to reinterpret the date. Existing backend authorization/snapshot tests remain
authoritative; mounted mobile screen tests cover presentation with native adapters.

## Bounded composite academic reports (2026-10-26)

AcademicReportRepository owns report-card/class-overview multi-domain read snapshots.
Reuse existing entities/DTOs and AttendanceRepository.ForReport/SummaryPage; never
restore full attendance history graphs for report totals. ForReport joins an outer
repeatable-read transaction, accepts at most 200 roster IDs, and runs the shared
50-student grouping/window pipeline in bounded batches. Standalone summaries may
own their snapshot; joining a weaker transaction fails. No stored report model or
new schema is needed. Module person enrichment retains its existing response flow;
this does not prove an atomic snapshot of every post-read country contribution.

Composite DTOs now expose attendanceSummary instead of raw attendance. Ship Core,
API and SPA together. Scalar limit-plus-one probes run before includes: roster
200, grades 5,000, fees 200, schedule slots 200. Oversize is localized 413, never
silent truncation. GETs use no-store, heavy admission, cancellation and a cooperative
20-second budget, including checks between mapped roots. Synchronous legacy actor
label IO is not a hard-deadline or batched-mapping guarantee. Fees are scoped to
selected year/school. Keep class/course/enrollment year and school consistent;
sanitize foreign references only on response copies. Parent reports require a
current active same-school link, consistent with attendance reads; stale cross-school
links cannot bypass tenancy. Do not delete invalid historical data in a read.

AppAttendanceSummary.initialSummaries reuses a bounded complete report snapshot for
unfiltered paging; explicit filters/sorting read a new server aggregate over the
original marks. Report KPIs still describe the composite snapshot. Keep country
calendar/UTC civil-day rendering and all table filters. useClassOverview(classId)
and useReportCard(kind,studentId) now reuse useReloadableRead, scoped credentials,
cancellation, manual retry and same-scope retention. Do not mirror their data into
unscoped screen state. Admin comment drafts survive same-resource refresh and late
outcomes cannot update another mounted resource. Protected comment mutation versions and durable replay are described below;
these read contracts do not protect unrelated writers. ID cards use school.getStudent,
not the multi-domain report-card endpoint. See Core docs/ACADEMIC-REPORT-LIMITS.md.


## Report-comment versions and durable recovery (2026-10-26)

ReportCardComment reuses the existing Student.Revision through the explicit
IRevisionedExtension.RevisionOwner contract, like country person profiles. Do not
add a separate comment revision, history or request table. Creation/edit/clear
advance the tracked student owner version; profile/country changes therefore
conflict conservatively. Load that owner in the same unit of work. No schema
migration is required; metadata-only version changes must not rotate login stamps.

Core ReportCardCommentRepository replaces the controller's direct upsert. GET of
/report-card/student/{id}/comment reads only version/year/comment in one small
snapshot. Use SchoolAcademicYearRepository.GetBannerAsync for the school's actual
start, with the existing shared year fallback only when school settings are absent.
The country UI formats that civil date at UTC. No active year means no editable
metadata. PUT requires the stable Idempotency-Key, original revision and explicit
calendarYearId. Reuse RecordVersions.LockAccount/Check and MutationReceiptStore;
check current actor/stamp/impersonator/staff reports.write and school membership
after receipt/student waits. Replay an accepted original result before checking a
new active year/version, without reapplying text after a later clear/correction.
No automatic retries or silent rebase. Keep original clear/delete semantics.

AppReportCardCommentEditor belongs in SPA Core. Compose AppBaseEditor, Core form
controls, useVersionedRecordEditor/useMutationIntent and shared conflict review.
Freeze an unknown submission's body/ID; keep editing locked until recovery or a
known version rejection. Same-actor record switches need a fresh intent, while
token renewal retains the original one. Validate acknowledgements before resetting;
ignore old account/resource outcomes. Advance only the acknowledged form token.
Explicit comparison/replacement includes the country-formatted year context and
never submits. Mounted-form recovery is not a cross-reload draft store. Keep this
editor mounted during the independent report refresh so locale/token changes do
not discard drafts. Hide every editor state from print. AppBaseEditor.submitLabel
only delegates to existing AppFormCard, retaining defaults for other forms.

Deploy Core.Abstractions/Core/API/SPA together and remove old API writers; they
ignore this version/key contract. All three locale surfaces and mirrored mobile
strings must ship. The workflow does not coordinate every unrelated year/reference/
grant writer through commit, and the overall concurrency/performance goal remains
open. See Core docs/REPORT-COMMENT-CONCURRENCY.md for the verified contract/limits.


## Report-authorized attendance filters (2026-10-26)

Report-card/class-overview attendance tables use AttendanceSummaryScope.context to
select matching report routes through the existing summary transport. Keep ordinary
attendance sources unchanged. reports.read does not imply attendance.read; never
broaden dynamic-role grants to make a report filter work. Core AcademicReportRepository
reuses shared report ownership/year predicates and AttendanceRepository.Summary inside
one repeatable-read snapshot. Route student/class IDs are authoritative; a student
query can only narrow a class. Student/parent routes retain account/link restrictions.
Filter original marks before grouping, preserve bounded pagination/recent windows,
no-store/cancellation/report budgets and all locales. Do not load an entire report
again just to filter attendance. Include context in read/reload identities, keep
snapshot-only paging request-free, and treat filtered aggregates as fresh reads.
No new table, field, DTO or index. Ship Core endpoints before/with SPA consumers.


## Batched report-root audit labels (2026-10-26)

UserResolver.PrimeAsync extends the existing scoped scalar label cache and query.
Prime at most 50 Base roots, at most 100 distinct creation/update actors per batch;
never gather an unbounded graph/list of actors. AcademicReportRepository maps each
50-root batch immediately after priming, within its existing snapshot and report
cancellation budget. Keep identity precedence, school-scoped cache keys, platform
labels, cached misses, save invalidation and the 512-entry ceiling. No global cache,
new actor table or copied lookup pipeline. Fallback and primed paths share one query.
Nested unprimed actor mappings and other callers may still perform synchronous
lookups; this step does not finish the actor/query audit or guarantee hard deadlines.
