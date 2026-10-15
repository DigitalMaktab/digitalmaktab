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
- Ministry document dates: implemented and verified in real XLSX artifacts.
  Country-owned repository/service/workbook builder use Core's school-year and
  calendar-provider backbones. Headers follow the selected school year; current
  classes follow active enrollments in that year/school. Birth/hire/joining dates
  use Solar Hijri values, and the no-year fallback uses the Afghanistan civil day.
  Existing sheet structure is preserved; row numbering and blank-name fallback
  are corrected. Missing-details preparation is scoped and idempotent.
- Shared transcript/report-card documents: verified in real Chrome PDFs with
  Afghan fields, native dates, all three languages, screen themes and RTL/LTR.
  A shared Core print boundary hides dashboard controls and keeps complete rows.
  Transcript courses reuse AppTable with real creation metadata. Structured
  addresses avoid object placeholders. Failed reads are visible and abandoned
  reads cancel without repeated loader-triggered requests. The backend projects
  country codes before enrichment, orders years by date, falls back through the
  calendar provider, and selects each student's school year for report cards.
  English/Dari/Pashto month labels now agree across backend and SPA catalogs.

## Verification of examination-period implementation

- `bash scripts/tests/run-afghan-academic-postgres.sh`: 32 tests pass with no skips;
  real PostgreSQL migration replay and Kestrel HTTP requests cover roles,
  country/school isolation, duplicate/overlap/range errors, stale updates,
  creation-date and academic-year filtering, and year boundary changes. Scheduling
  tests also cover real exam POST/GET/DELETE, version/foreign-school rejection,
  class-year resolution, linked-period integrity, assignment cascade deletion,
  school-provider precedence and transaction rollback after a provider failure.
  A separate full-schema PostgreSQL database verifies real Ministry report GETs,
  selected-year/enrollment behavior, XLSX dates/layout/numbering, school isolation,
  role/country access and repeated missing-details preparation. It also exercises
  transcript/report-card HTTP responses, nested Afghan fields, year/class labels,
  course audit metadata, scores, parent/student access and a linked child's year
  at another school. Test mapping is fixture-specific; repositories/controllers
  and the country enrichment filter are real.
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
- `node scripts/tests/ministry-reports.cjs`: actual country download screens in
  all three languages, error details, abort handling, filenames/URL cleanup and
  missing-details feedback. Actual Core API interceptors verify binary downloads
  bypass offline cache reads/writes and stale-on-error fallback.
- `node scripts/tests/academic-documents.cjs`: real shared documents and screens
  verify safe addresses, country fields, native dates, language/direction, HTTP
  200 handling, failures/cancellation and one request through LoaderProvider.
- `node scripts/tests/academic-document-browser.cjs`: real Chrome desktop/mobile
  dark/light rendering and eight real PDFs for transcripts/report cards in
  English, Dari and Pashto, plus Gregorian Austria. Inspects the last of 60 rows,
  hidden dashboard/filter controls and absence of object placeholders. Artifacts
  are retained in the temporary digitalmaktab-academic-print-* directory.
- The calendar integration also fixes events with no end time appearing in every
  later calendar request. The existing event date defines its end when none is set.
- Shared PDF/filter/module audit passes across 97 AppTable sites. Core component
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

## Additional Afghanistan examination categories (15 October 2026)

- Country-owned `AfghanExamType` now defines midterm (0), annual/final (1),
  supplementary/Mashrooti (2), excused/Mazurati (3), merit/Liaqat (4),
  placement/Tasbit-e-Sinf (5), and external-candidate/Samea (6).
  Original persisted values and JSON numbers remain compatible. Core's grading
  component enum stays independent of country examination categories.
- A new country migration expands the database check constraint; existing
  migrations and records are retained. Rollback cannot silently delete records
  using the added categories.
- All categories are available in the existing shared table/editor, applied
  type filters, PDF/CSV labels, scheduling options and country calendar entries.
  English, Dari, Pashto and mobile translation catalogs have matching keys.
- Supplementary, excused, merit, placement and external exam windows may overlap
  each other or regular exams. Existing midterm/annual overlap protection,
  school-year bounds, unique type per year, tenant isolation, optimistic versions,
  and linked-sitting guards remain in force.
- These changes classify periods and scheduled sittings. They do not create a
  supplementary-score replacement policy, automatic promotion rule, or a new
  government-required examination timetable.
- Ministry sources checked:
  - https://moe.gov.af/dr/فشرده-چند-خبر-از-معارف-مرکز-و-ولایات-6
    (1403/12/20: explicitly names Liaqat, Mashrooti and Mazurati school exams).
  - https://www.moe.gov.af/dr/فورم-های-عرضه-خدمات
    (student services: Samea exams for grades 7–11/12 and returnee placement).
- Verification: isolated PostgreSQL migrations and real HTTP academic/report
  workflow: 33 passed, zero skipped. Shared React table/editor checks exercise
  all seven categories and save each new category in all three languages.
  Localization parity and shared-component reuse audits pass.
- Full shared PDF/filter/module regression audit passes across 98 table sites.
  Backend/API and SPA packages were rebuilt and synced; the consuming SPA
  production build succeeds with existing CRA/ESLint warnings.
