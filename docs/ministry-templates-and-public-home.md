# Ministry templates and public homepage

## Completed implementation

Afghanistan owns the new `/afghanistan/ministry-templates` page, its sidebar
entry, report data contracts/repository/service, API routes and embedded Excel
assets. Core owns the shared appearance selector/layout, theme preference hook,
controlled select and cancellable binary-download hook. The shell only composes
the public page. Other countries do not activate the Afghanistan feature.

## Supplied workbook inventory

The four most recent ministry workbooks in Downloads were inspected. Their
source SHA-256 hashes, all 35 sheet layouts, pupil input row addresses and hashes
of untouched OOXML parts are in the Afghanistan module's
`Reports/Templates/manifest.json`.

- Incoming/outgoing three-parcha register: 2 right-to-left sheets, 28 merged
  regions each, school/province/district/EMIS/year header, grouped previous/new
  school headings and 13 report columns. Incoming sheet retains its original
  16-column worksheet extent and blank decorative merged cells.
- First shift: 11 sheets for grades 1–2, 25 columns, 356 pupil blocks.
- Second shift: 11 sheets for grades 3–4, 25/28 columns, 384 pupil blocks.
- Third shift: 11 sheets for grades 5–6, 28 columns, 356 pupil blocks.

Each results pupil block contains midterm, annual and total rows. The layouts
retain original fonts, number formats, borders, widths, heights, hidden metadata,
merges, ministry artwork/drawing anchors, signature/seal areas, landscape print
settings and 20,258 original formula expressions. Grades 1–3 retain their special
Pashto/Dari alternative-subject formulas; grades 4–6 retain their separate subject
columns and result rules. Reports never rebuild these forms using generic table
markup or recreate the workbooks with ClosedXML.

Blank templates remove the supplied school/pupil identities, cached formula
results and file-author details. An unused external-workbook link in the transfer
sample contained cached donor records and a local file path; it was removed.
Original source files are untouched and are not committed. All other unused
parts remain byte-for-byte identical, recorded in the manifest.

## Report behaviour

- Blank downloads provide all original sheets, including every supplied layout
  variant. Current-school class results fill identities, enrolment and available
  midterm/final marks; Excel recalculates the preserved formulas on opening.
- Class selection fixes both tenant and academic year. Results use the appropriate
  grade workbook, continuing excess pupils on another same-grade sheet. The
  supplied layouts cover grades 1–6; unsupported grades or workbook capacity
  overflow return a translated error rather than omit records.
- Subject names are matched using an Afghanistan-owned explicit alias map.
  Unrecognized subjects or conflicting marks return a translated error rather
  than silently mislabel scores. Missing marks remain blank, including actual
  recorded zero scores which are preserved as numeric zero.
- Afghanistan now owns `AfghanMinistryRecord`: one verified register entry per
  immutable enrolment and exam period. It stores period-specific enrolment,
  instructional/present/absent/sick/leave days and exam participation (sat,
  excluded, excused or did not sit). Nothing is inferred from missing input;
  explicit zero remains distinct from an unrecorded period.
- Both periods must be recorded before a class-results export. Daily category
  totals must balance; periods together cannot exceed the academic-year date
  span. A pupil not enrolled in a period must have zero days and no sitting.
  Version checks and an enrolment-scoped transaction lock prevent lost updates
  and conflicting cross-period totals.
- Workbooks fill all five attendance columns for each period and their summed
  total row. Summaries count enrolled pupils and participation statuses for
  each sheet. Promotion/repetition/conditional counts reference the original
  ministry result formulas. For a recorded non-participant, the original result
  expression is retained inside a formula branch that displays the saved status;
  the annual letter grade stays blank. Marks from a non-sitting are not printed.
  No source template layouts or original source expressions are rewritten.
- Transfer exports include only completed/released transfers involving this
  school. Both dates are required, inclusive and interpreted as Kabul civil days.
  Incoming/outgoing school columns follow the corresponding supplied sheet.
  Additional records copy the original input row's formatting.
- Routes enforce module country targeting and school capabilities; report
  responses disable caching. Downloads run once, expose localized failures and
  cancel when the page is abandoned.

## Entering ministry data

Open **Afghanistan → Ministry attendance and exam records** at
`/afghanistan/ministry-records`, or follow the link from class-results exports.
Choose the class inside AppTable's filter panel and Apply. Double-click a pupil
or choose midterm/annual in the row menu. Enter verified register totals and
period-specific enrolment/participation, then save each period. Class, year,
enrolment and country ownership are enforced by the API; existing Core daily
attendance records are not repurposed or assigned guessed sickness/leave values.

The list uses Core's shared table, date/text/completion filters, exports and row
menus. Editors use Core forms, inputs, selects and validation. Authorized readers
see a read-only detail; writes require `attendance.write` and `students.read`.
The entity, rules, repository, service, DTOs, controllers, migrations and screens
all live in Afghanistan packages. New strings are mirrored in en-US/fa-AF/ps-AF
and mobile bundles. The two country migrations apply during API startup.

## Public homepage

The public page now uses its missing landing layout class and respects the saved
appearance preference. Core synchronizes light/dark/system preference, Bootstrap
and app theme attributes, OS changes and other tabs. The public header uses the dashboard’s shared globe language picker and sun/moon
control; both headers share the same preference hook. The navbar uses the app’s
opaque card surface, stays pinned while scrolling, and retains contrast in both themes.
The homepage has a semantic main heading, direct registration/sign-in actions,
public privacy/support routes that require no private API calls, compact responsive spacing, dark feature cards and
keyboard/mobile navigation with an accessible menu toggle. English, Dari and
Pashto strings also have mobile counterparts.

## Verification

- `python3 tools/verify-ministry-templates.py /path/to/Downloads` in the Afghanistan
  backend compares every supplied formula, cell style and complete non-cell
  worksheet structure against source files. All 35 layouts / 20,258 formulas pass.
- `scripts/tests/run-afghan-academic-postgres.sh`: 94 tests, including isolated PostgreSQL migration/API flows,
  real workbook downloads, class/year/school/country boundaries, balanced
  attendance, explicit zeros, late enrolment, concurrent writes, both worksheet
  layouts, decimal marks and Kabul transfer date boundaries.
- `scripts/tests/ministry-reports.cjs`: actual report screens/shared download hook
  across all locales, correct paths/date payloads, filenames and cancellation.
- `scripts/tests/ministry-records.cjs`: real Core tables/forms across all locales,
  draft/applied class filters, empty states, zero/invalid values, stale edits,
  read-only staff and abandoned requests.
- `scripts/tests/public-home.cjs`, `root-route.cjs`, `school-dashboard.cjs`:
  appearance persistence/system changes, public/private routing, mobile controls
  and dashboard regressions.
- Browser previews cover desktop light, Dari dark, and mobile light/dark.
- Package sync, TypeScript and translation parity checks complete before commit.

No user-owned API or SPA server was restarted. Restart `dotnet watch run` and
`npm start` to load the newly packed modules.

## Research: academic-year setup versus pupil records (2026-10-18)

The ownership research below informed the implemented school-year settings described at the end of this document. Operational workflows not listed as implemented remain design guidance.

- [MoE, 1405 cold-region midterm notice](https://www.moe.gov.af/dr/اطلاعیه-وزارت-معارف-در-رابطه-به-آغاز-امتحانات-چهارونیم-ماهه-و-تعطیلات-تابستانی-سال-تعلیمی-۱۴۰۵), published 1405/4/10:
  grades 1–3 and 4–12 have different exam start dates. Shared calendar configuration
  needs grade-cohort scope, rather than one universal date pair per exam type.
- [MoE, warm-region school-year notice](https://moe.gov.af/index.php/dr/اختتام-سال-تعلیمی-و-آغاز-امتحانات-سالانه-مکاتب-در-ولایت-های-گرمسیر-کشور), published 1404/3/3:
  the teaching year runs from Sunbula to Thawr in the next Solar Hijri year.
  Keep explicit school-specific date bounds; do not assume every school starts in Hamal.
- [MoE, annual-exam notice](https://www.moe.gov.af/dr/اطلاعیه-وزارت-معارف-47), published 1403/8/20:
  exam eligibility attendance thresholds vary by grade and documented excuse.
  This historical notice is evidence for versioned, scoped policies, not proof of
  a universal current-year rule. The 1404 census form has a generic 75% reporting
  category, which must not silently replace grade-specific eligibility rules.
- [MoE 1404 general-education census](https://moe.gov.af/sites/default/files/2025-05/تعلیمات%20عمومی%20سال%201404.pdf), page 5:
  enrolment, exam inclusion and outcome totals are distinct reporting categories.
  The supplied workbooks likewise separate instructional days, presence, absence,
  sickness and leave. These totals are not all academic-year settings.

Recommended ownership (application design inference from the sources):

| Owner | Data |
| --- | --- |
| Core school academic-year aggregate | School ownership, calendar-year reference, year bounds, timezone, lifecycle, default teaching weekdays; generic child teaching terms with cohort scope |
| Afghanistan academic-year extension | Solar Hijri year designation, warm/cold/extremely cold teaching-season classification, ministry reporting-period bindings |
| Core teaching terms + Afghanistan bindings | Generic dates, cohort scope and weekday overrides in Core; first/second ministry-period meaning in Afghanistan; calculated day totals reuse Core holidays |
| Afghanistan exam period | Exam type, grade cohort and sitting window, linked to the academic year; retain supplementary/excused and other exam types |
| Core enrolment and daily attendance | Effective pupil enrolment history and recorded attendance facts; missing records remain unknown |
| Afghanistan pupil ministry record | Reviewed per-pupil attendance categories, registration and participation decisions; source/version snapshot for historical exports |
| Afghanistan eligibility policy | Grade/period/year-scoped threshold and approved-excuse rules, source reference and version; proposed eligibility remains distinct from actual sitting |

The academic-year screen should manage shared settings once. Ministry preparation
should select the class/year/period and inherit that configuration, displaying
instructional days as a calculated value. Late enrolment or transfers require explicit
effective enrolment dates before pupil-specific expected-day totals can be automated.
Do not derive those dates from record creation timestamps. Shared calendar edits must
not silently rewrite already reviewed records or previously issued report results.
Existing historical totals must be retained until explicitly reviewed; disagreement
between pupils' manually entered totals is not a safe source for a school-wide calendar.

Automated preparation now inherits teaching terms and weekdays from the saved school-year setup. Core excludes holidays, applies explicit closures/replacement days, and distinguishes missing, duplicate and unverified attendance. A shared form-fill control preserves unrelated edits.
An Afghanistan-owned hourly readiness sweep reminds the school administrator of
missing ministry records for configured midterm/final periods starting within seven
days or already started, once per seven days per period. It does not decide eligibility.
Fees now check the school's calendar month hourly and on startup, with a database
lock preventing concurrent automatic/manual duplicate generation. Scheduled inferred
presence is disabled. School backups include module contributions and additional
school-owned Core tables; the manifest explicitly states uploaded files are excluded.

### Complete school academic-year information to persist

The storage boundary is explicit: reusable data and infrastructure in Core;
Afghanistan-specific meanings, policies and ministry data in Afghanistan. This is a
proposed schema, not a description of fields already present in today's database.

| Area | Information and relationships | Owner |
| --- | --- | --- |
| Identity | Immutable school-year ID, SchoolId, existing CalendarYearId, display label, previous/next school-year references | Core |
| Dates and state | Year start/end, teaching start/end via terms, timezone, draft/open/closed/archived state, active flag, published/closed timestamps and actor IDs | Core |
| Scope | Grade range and optional branch/class/shift applicability, explicit override precedence, valid school ownership | Core |
| Teaching terms | Name/code, sequence, start/end, workweek, links to relevant assessment/reporting periods | Core generic terms; Afghan period mapping in Afghanistan |
| Working calendar | Default weekdays, effective-dated exceptions, holidays, breaks, emergency closures and compensating teaching days with reason and approval | Core, extending existing Holiday/SchoolEvent rather than duplicating them |
| Day totals | Computed teaching days by term/cohort; official approved count when supplied, source document and reason for any difference | Core calculation/snapshot; Afghan official declaration and reconciliation rules in Afghanistan |
| Exam windows | Type/category, date window, grade/cohort scope, attempt, linked term/year, linked actual Core Exam sittings | Core scheduling + Afghanistan-owned categories, period constraints and links |
| Attendance policy | Policy version/source/effective dates; threshold by grade and period, documented-excuse handling, denominator definition, transfer/late-entry treatment and rounding | Generic policy/version support in Core; Afghan rules and values in Afghanistan |
| Assessment policy | Applicable grading-provider/policy version, components/weights, pass/conditional/promotion rules and supplementary-result treatment | Shared contracts in Core; Afghan implementation/values in Afghanistan |
| Operational dates | Admission/registration windows, attendance/marks entry deadlines, review/publication dates, correction/appeal windows and any approved extensions | Core configurable milestones; country-mandated milestone definitions/rules in their country module |
| Reporting | Template/policy version, ministry period mapping, approved totals, signoff, generated document references and generation parameters | Core export/audit primitives; Afghanistan ministry content and schema in Afghanistan |
| Close and rollover | Destination year, closure checklist, unresolved results/transfers, reviewed promotion batch, approval, reopen reason and history | Core workflow; country promotion/eligibility provider |
| Governance | Version token, change history, approver, policy/document references and applicable dates; immutable references on published reports | Core audit/versioning; country source attachments in country module |

The current Core CalendarYear is a shared reference (date + native-year label), not
a school-specific configuration record. Do not add one school's teaching dates,
holidays or active lifecycle to that shared row. A school-owned aggregate must wrap
it; Afghanistan extends the school aggregate rather than forking it.

Do not place a pupil's registration, daily attendance, sickness/leave evidence,
exam sitting or final result on the school-year row. Keep those records linked to
the pupil's enrolment and actual exam/period. Ministry summaries are derived from
those facts and retained as reviewed export snapshots. Expected instructional days
come from the shared calendar, adjusted only using explicit effective enrolment data.

Recommended screen composition: General, Teaching terms, Working days and breaks,
Exams, Policies, Reporting, Close/rollover. Generic tabs use Core components; country
modules add their own tabs/fields and capabilities. A pupil editor inherits the
applicable setup instead of repeatedly asking for teaching dates and weekdays.

Research caveats: the 1405 notice confirms grade-dependent exam dates; the 1404
warm-region notice confirms a cross-Solar-Hijri-year teaching season; the 1404 census
lists warm/cold/extremely cold climates. Ministry news published 1403/12/20 also
confirms supplementary, excused and merit examinations, so the schema must not
assume there are only two examination types. Historical notices are not silently
promoted to a current-year universal rule. No authoritative current-year national
instructional-day total was verified during this research; store source-backed,
scoped declarations rather than inventing a fixed 180/185/200-day default.

## Implemented school-year settings

`/afghanistan/academic-years/:id` now saves both the reusable Core settings and the
Afghanistan policy in one school-locked transaction, with independent optimistic
versions. The shared `CalendarYear` reference is unchanged. Core owns a related
`SchoolAcademicYear` record per school/calendar-year identity: explicit year bounds
and a typed JSONB plan containing display name, timezone, lifecycle, teaching
weekdays, grade-scoped terms, calendar exceptions, deadlines/milestones, previous/next
year references and grading/promotion/source references. The plan is edited through
shared Core fields and repeatable form sections; no raw JSON editor is exposed.

Afghanistan owns climate classification, ministry template/source references and
reporting-period bindings to Core teaching-term codes. Each binding has an applicable
grade range, optional official instructional-day declaration and optional regular /
approved-excuse attendance thresholds, with a required source for those declared
values. These policy values are stored for review; they do not silently determine
exam eligibility or promote pupils. Actual exam windows remain separate, linked to
the year; they now support different grade ranges. Duplicate or overlapping windows
for the same grade group are rejected, while different grade groups may have different
windows. Scheduling rejects classes outside the selected window's grade range and
window edits cannot invalidate already linked sittings.

The Core migration creates only the new school-year table and indexes. The country
migration adds its policy data and exam grade scope and backfills existing Afghan
year bounds into Core. It deliberately leaves teaching terms unconfigured. Existing
year IDs, enrolments, daily attendance, grades and reviewed ministry records remain.
No migration removes legacy country tables or person columns.

Ministry preparation now POSTs an empty criteria object: it resolves the pupil's
class/year/grade and reporting period, inherits applicable teaching terms and the
saved timezone/workweek, and applies Core holidays and year-specific exceptions.
Pupil-level teaching dates/weekdays have been removed. Instructional days are shown
read-only in the pupil editor. Year details expose calculated day totals per term;
ministry preparation flags disagreement with an official declaration. For a configured
year, new pupil entries must match the calculated instructional-day total. Existing
reviewed totals remain historical snapshots, and unconfigured historical paper-register
imports remain supported for compatibility. A pupil not registered for a period has
an explicit action to set zero attendance and no sitting. Calendar edits do not rewrite
saved pupil records.

Validation covers timezone, weekdays, names/date bounds, grade ranges, overlapping
terms and exceptions, cross-school year references, ministry-term bindings and
source-backed policy values. The editor uses Core forms, inputs, selects, checkbox
groups, date pickers, accordions and confirmation modals. English, Dari and Pashto
translations are mirrored to mobile. Generic settings and controls contain no
Afghanistan implementation imports.

Verification includes isolated PostgreSQL migration and HTTP workflows, school
isolation, settings round-trips, independent version conflicts, ministry inheritance,
read-only pupil teaching days, grade-specific exam windows and all three frontend
locales. These tests use temporary databases, not the user's development database.
Restart the API and SPA after the package sync; normal API startup applies migrations.
