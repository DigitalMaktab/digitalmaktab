# Afghanistan feature implementation

Keep Afghan entities, DTOs, domain rules, repositories, services, controllers,
migrations, screens, routes and sidebar contributions in the country packages.
Reuse Core primitives and introduce generic extension contracts in Core only
when integration requires them. Commit affected repositories locally; do not push.

## Solar Hijri academic workflow

- School years: implemented and previously verified, including school-specific
  activation, native calendar dates and current-year request/background resolution.
- Examination periods: configurable midterm/final windows, country-owned schema
  and API, table/editor and sidebar item at `/afghanistan/exam-periods`.
  Dates must fit teaching dates, cannot overlap, and have one type per year.
  Versioned edits and a shared school write lock protect concurrent changes.
  Year edits cannot exclude existing periods.
- Calendar integration: implemented through Core's optional
  ISchoolCalendarContributor contract. Afghanistan owns its repository query,
  localized titles, label key and editor path; Core composes scoped contributions.
  Real PostgreSQL/HTTP verification includes Core holidays/events/exams, period
  boundaries, all three cultures, teacher reads, country isolation and an
  independent school module. Shared frontend tests cover native month bounds,
  all languages, internal editor links and viewer permissions.
- Individual examination scheduling: implemented through a generic Core provider
  and shared AppExamCreateForm. Afghanistan owns the assignment entity, migration,
  repository, version/date/year rules and labels. Full sittings must fit their
  period in Afghanistan civil time. Core creation and the country assignment use
  one transaction and the existing school write lock. Linked period edits cannot
  strand sittings. School providers override country providers; schools without
  providers use the selected class's year. No Afghan field was added to Core Exam.
  Raw HTTP success handling and the empty user-year UUID submission were fixed.
- Document dates: inspect all country reports and official document flows, reuse
  the existing calendar backbone, and verify native dates in actual artifacts.

## Verification of examination-period implementation

- `bash scripts/tests/run-afghan-academic-postgres.sh`: 25 tests pass with no skips;
  real PostgreSQL migration replay and Kestrel HTTP requests cover roles,
  country/school isolation, duplicate/overlap/range errors, stale updates,
  creation-date and academic-year filtering, and year boundary changes. Scheduling
  tests also cover real exam POST/GET/DELETE, version/foreign-school rejection,
  class-year resolution, linked-period integrity, assignment cascade deletion,
  school-provider precedence and transaction rollback after a provider failure.
- `node scripts/tests/afghan-academic-years.cjs`: real shared React table/editor
  and country calendar with a mocked HTTP boundary. Covers localized labels,
  native dates, draft/Apply/Reset behavior without repeated requests, period
  versions, stale errors, invalid school-year selection, initial active year,
  and empty-state navigation. Also passes in America/New_York.
- `node scripts/tests/exam-scheduling.cjs`: real shared form and consuming exam
  screen with mocked API/selector boundaries. Covers Hijri and Gregorian date
  selection, version refresh, errors, retries, in-flight button protection,
  HTTP 200 handling, class-year fallback and shared label filtering. Also passes
  in America/New_York. Core's existing 20-test regression suite passes.
- The calendar integration also fixes events with no end time appearing in every
  later calendar request. The existing event date defines its end when none is set.
- Shared PDF/filter/module audit passes across 96 AppTable sites. Core component
  reuse audit passes across 185 source files. Localization parity passes across
  frontend, backend and mobile bundles.
- Backend and SPA packages rebuilt and synced into local consumers. Development
  servers must restart to load the swapped packages.

## Remaining broader feature areas

The goal remains open. Existing implementation must be inspected before adding
anything to these areas; their completion is unverified:

- Asas register management, search and duplicate detection.
- Paper/electronic Tazkira details and optional attachments.
- Student files, transfer documents, examination sheets and Ministry reporting.
- Validation of missing/inconsistent identity and report fields.

An optional prioritization question was sent for these areas. Continue the
remaining Solar Hijri workflow independently while awaiting an answer. Do not
invent government-required document layouts or academic dates.
