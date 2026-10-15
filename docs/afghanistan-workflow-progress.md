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
- Next: show country periods in the shared school calendar using a generic Core
  contribution contract, then connect individual examination scheduling to the
  selected window without duplicating the Core examination editor or scheduler.
  Core Exam currently has no examination-type field and no module validation hook;
  inspect these boundaries before choosing the integration.
- Document dates: inspect all country reports and official document flows, reuse
  the existing calendar backbone, and verify native dates in actual artifacts.

## Verification of examination-period implementation

- `bash scripts/tests/run-afghan-academic-postgres.sh`: 20 tests pass with no skips;
  real PostgreSQL migration replay and Kestrel HTTP requests cover roles,
  country/school isolation, duplicate/overlap/range errors, stale updates,
  creation-date and academic-year filtering, and year boundary changes.
- `node scripts/tests/afghan-academic-years.cjs`: real shared React table/editor
  and country calendar with a mocked HTTP boundary. Covers localized labels,
  native dates, draft/Apply/Reset behavior without repeated requests, period
  versions, stale errors, invalid school-year selection, initial active year,
  and empty-state navigation. Also passes in America/New_York.
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
