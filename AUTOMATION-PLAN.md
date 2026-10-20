# Automation work plan

Goal: identify and implement useful process automation across the app, using the
shared Core and country/school extension boundaries. Human decisions remain with
users: no fabricated student attendance, grade decisions, payment confirmation,
admissions approval, promotion, or reporter acceptance of support tickets.
The user now authorizes evidence of teacher lesson presence from the assigned
authenticated teacher or approved substitute recording attendance; preserve the
lesson, actor and assignment audit trail, without inventing handwritten signatures.

## Audit evidence (2026-10-19)

- Core already has jobs for school-calendar fee rollover, overdue-fee reminders,
  assignment due dates, accepted admissions awaiting conversion, stale grade
  appeals, low inventory, teacher leave, birthdays, school/operations digests,
  backups, and cleanup. Registrations are in `digitalmaktab-api/Program.cs`.
- Most older jobs use fixed UTC times. Assignment reminders, for example, scan a
  36-hour window at 15:00 UTC and deduplicate against recent notifications.
- Core's `SchoolAcademicYear.Plan` already owns timezone, teaching weekdays,
  teaching terms, exceptions and milestones. Country year selection already
  resolves through `ISchoolAcademicYearProvider`.
- The dashboard automation queue only counts admissions, appeals and inventory;
  schools have no shared automation configuration or preview screen.
- Exams, booked PTM slots, school event RSVPs and academic milestones contain
  enough data for useful upcoming reminders, but have no scheduled reminder
  workflow. Sources are Core's Exam, PtmSlot, SchoolEventRsvp and SchoolAcademicYear.
- AttendanceAutoRollCallBackgroundService is unregistered and its service refuses
  unattended auto-present marking. Preserve that protection; replace the obsolete
  automation idea with completion reminders, never fabricated attendance.
- Afghanistan already owns ministry-readiness background work; extend/integrate
  that module rather than adding Afghan rules to Core.
- Existing notification service persists inbox rows, respects user preferences in
  fan-out, and publishes via SignalR/push. New jobs must reuse its delivery layer,
  store deduplication receipts independently of notification retention, and avoid
  duplicate rows when multiple hosts run.

## Work streams and verification

1. **School automation controls and calendar reminders — complete and verified.**
   - Shared school configuration, preview, last-run outcomes and access capability.
   - Opt-in upcoming exams, booked parent-teacher meetings, RSVP event reminders,
     and academic milestones; no paid email/SMS integration.
   - School timezone/native calendar and recipient language; inactive accounts
     and schools excluded; user notification preferences honored.
   - Persisted unique delivery receipts; recover on restart; transactional inbox
     writes; delivery after commit; bounded runs and school isolation.
   - Country/school sources can contribute through an owned Core abstraction.
   - Verify real PostgreSQL migrations, HTTP permissions/tenant scoping, windows,
     duplicate runs, restart behavior, preferences, languages, UI, and sync.
2. **Daily completion and decision queues — complete and verified.** Missing
   attendance on confirmed teaching days, module-owned bound exam marks, and
   overdue decision queues with scoped direct links. See evidence below.
3. **Existing recurring work — pending.** Integrate existing reminder controls,
   strengthen duplicate prevention, catch-up and inactive-school behavior; retain
   existing billing/calendar semantics and user approval boundaries.
4. **Country academic workflow — pending.** Integrate Afghan ministry readiness,
   academic deadlines and report preparation using module-owned providers; verify
   those contributions do not activate for other countries/schools.
5. **Platform support workflow — pending.** Assignment/reporter-testing reminders
   with duplicate suppression and platform-owned controls. Only the reporter can
   accept a completed ticket; automation never bypasses the workflow.

A work stream is complete only after its implementation, meaningful checks,
package sync and local commits are recorded here. The goal stays active while
required work remains. Do not enable optional rules on existing schools or send
live notifications as part of development verification.


## Completed work stream 1 (2026-10-19)

- `/automations` is in the shared administration sidebar, gated by
  `automation.manage`; all controls, modals and tables use Core primitives.
  Settings are versioned, opt-in and tenant-owned. Draft previews never save or
  send. Rule and preview tables retain the shared filter/export conventions.
- Core runs upcoming exam, booked PTM, Going-RSVP event and academic milestone
  rules every minute, including startup. Schools can set a 15-minute to seven-day
  window and an optional IANA timezone override. Native dates and recipient
  languages come from the existing providers. Staff recipients require current
  active role capabilities. SYSTEM notification opt-outs are respected.
- Per-school/rule advisory locking plus unique durable receipts prevent duplicate
  inbox creation. The inbox and receipt commit atomically; realtime publication
  follows the commit and remains best effort. A fresh scoped runner reuses stored
  receipts, including after inbox cleanup. Rescheduling creates a new occurrence.
  Each rule creates up to 500 rows per sweep; subsequent sweeps take the rest.
- Country/school packages contribute `ISchoolAutomationSource` through Core's
  extensibility contract. Country targeting is verified in both directions.
  Missing records and invalid notification messages fail without partial writes;
  a failed background rule records a sanitized outcome and does not block others.
- Shared calendar FormatOptions now supports an explicit timezone. Gregorian,
  Afghan SPA and Afghan mobile formatting agree at timezone date boundaries.
  Preview uses the server-resolved timezone rather than the browser timezone.
- Added the missing teacher `/exams` route so reminder links resolve.

Evidence:

- `bash scripts/tests/run-core-support-postgres.sh`: 78 passed, zero skipped.
  Real PostgreSQL + HTTP covers narrow migration up/down and snapshot indexes,
  permissions, default-off and draft preview, enrollment and active-course rules,
  PTM booking, RSVP/staff/preferences, school/country boundaries, native-date and
  localized text, timezone windows, concurrent runners, deleted inboxes,
  rescheduling, bounded catch-up, transactional failures and stored run errors.
- `bash scripts/tests/run-afghan-academic-postgres.sh`: 97 passed, zero skipped.
- `node scripts/tests/school-automations.cjs`: passed in English, Dari and Pashto;
  checks validation, timezone/version payloads, preview without sending, stale
  preview invalidation, draft retention, single-flight save and busy modal guards.
- `node scripts/tests/calendar-timezones.cjs`: passed for SPA/mobile Solar Hijri
  and Gregorian dates, three languages, three timezones and midnight boundaries.
- `node scripts/tests/academic-year-banner.cjs`: existing calendar behavior passes.
- Chrome `school-automations-browser.cjs`: passes Dari dark desktop/320px, Pashto
  dark 360px, English light desktop; shared picker stays open, requests bounded,
  long preview footer stays visible, settings save and viewport/theme checks pass.
- SPA/Core TypeScript checks, translation parity, mobile locale coverage, diff
  checks and all local commit hooks pass. `sync-all.sh`, final `sync-spa.sh` and
  `sync-dotnet.sh` complete; mobile SDK/country packages rebuilt and swapped into
  their existing local consumers. User-owned API/SPA servers were not restarted.

Local commits (nothing pushed): Core `f56954e`, API `6abc30d`, SPA SDK `edb5a9e`,
mobile SDK `45e4336`, SPA Core `40ff2df`, SPA shell `319787c2`, Afghanistan backend
`5660243`, Afghan SPA `4b408b7`, Afghan mobile `12b16a4`, docs `4ac8812`.

## Next implementation evidence

Work streams 3–5 remain pending. Timetable research and redesign have been
added below; the full automation objective is not complete.

- `Attendance` stores a daily `DateTime` and uses Base.Status for the actual
  present/absent value. Completion checks must count an explicit absent row as
  completed, rather than filtering it out as inactive. Enrollment and class/year
  status determine the expected roster.
- Reuse `AttendancePreparationRules` with academic teaching terms, weekdays,
  exceptions and holidays. Do not assume Monday–Friday or infer an absent/present
  state from a missing row. Use the school timezone for the daily boundary.
- Core Grade links enrollment/course/exam type, not a scheduled Exam ID. Marks
  deadlines need a trustworthy grading/exam-type mapping from the owning workflow;
  do not guess the association from exam titles or courses.
- Upcoming rules use future occurrences. Completion rules need an explicit
  overdue-window contract rather than fabricated future timestamps, so their
  previews, duplicate receipts and school settings retain clear semantics.


## Completed work stream 2 (2026-10-19)

- Core completion rules expose explicit overdue windows and a configurable local
  daily review time; midnight is preserved. Staff configuration and previews
  require the rule's underlying resource capabilities.
- Missing student attendance respects active-year teaching terms by grade,
  weekdays, holidays, exceptions, enrollment as of cutoff and school timezone.
  Explicit absent rows are complete; unverified and conflicting rows need review.
- Afghanistan owns incomplete marks detection using explicit exam-period
  bindings. Zero marks and saved participation exceptions count as complete.
  Supplementary and other distinct exam types are not silently mapped to FINAL.
  Older unresolved periods stay in daily summaries even after teaching ends.
- Shared overdue fee-waiver, teacher-leave and data-request queues use a
  three-day operational grace, not an asserted statutory deadline. The newest
  daily cycle summarizes current unresolved work once, avoiding a seven-day burst.
- Direct reminder links apply validated class/date/course/exam criteria inside
  AppTable's filter panel. Queue requests abort on school/account changes and
  ignore stale responses. Platform users remain excluded from school aggregates.

Evidence: Core PostgreSQL/HTTP suite 87 passed; Afghanistan suite 101 passed;
shared automation settings, queue concurrency/isolation, scoped reminder links,
AI chat regression, sidebar access, all three languages, four Chrome viewport/
theme cases, SPA/Core TypeScript, i18n/mobile coverage and commit hooks pass.
`sync-dotnet.sh` and `sync-spa.sh` completed; Afghan mobile locales rebuilt and
swapped into both consumers. No live automation was enabled and user-owned
servers were not restarted.

Local commits: Core `93b9655`, Afghan backend `0debc8c`, SPA Core `3bce543`,
SPA shell `0762a56e`, Afghan SPA `259e7a7`, Afghan mobile `225743c`, docs `c9c6834`.
Nothing pushed.

## Added: Afghan taqsim awqat and curriculum (user requests, 2026-10-19)

Research and implement these together; no global identical-subject assumption.

- Inventory the Ministry's linked Dari and Pashto book catalogues for grades
  1–12, retaining source URLs, edition/profile choices and missing-link evidence.
  Subjects (mazmun), books and weekly teaching requirements are distinct records.
  Guides/workbooks/readers do not automatically create additional subjects.
- Afghanistan owns versioned grade curriculum templates and school/year adoption,
  primary/second/local-language choices and approved weekly subject quotas.
  Current book lists alone cannot establish compulsory subjects or teaching hours.
- Core owns variable school shifts, bell schedules, grade-specific daily periods,
  class shift assignments, rooms, teacher multi-subject eligibility, availability,
  workload and reusable constraint validation. Eight 40-minute periods is a user
  example to support, not a universal Afghan requirement.
- Generate a draft from the adopted curriculum and weekly quotas at academic-year
  setup; allow repeated subjects, manually pinned lessons and specialist
  preferences. Never double-book actual overlapping teacher/class/room intervals,
  even when shifts use different period numbers. Explain shortages/infeasibility;
  preserve published versions and require an explicit publish action.
- Reuse teacher leave requests; propose eligible per-lesson substitutes, notify
  school administrators, recheck conflicts and obtain final approval. A single
  substitute for an entire leave range is insufficient. Keep unresolved cover
  visible; do not silently cancel uncovered classes or claim a free teacher exists.
- Record lesson presence evidence only from the authenticated assigned teacher
  or approved cover teacher taking attendance for that lesson. Keep student daily
  rollcall separate, primary teacher/cover evidence explicit, correction auditable.
- Afghanistan owns taraqi talim and monthly per-class Solar Hijri register print
  profiles. Taraqi talim must be exportable to PDF at any time, for a selected
  class/date range, including incomplete/current periods and available evidence.
  Verify actual page layout, symbols, totals, headers, signatures,
  sheet dimensions and binding margins before claiming official-format parity.
  Payroll attendance forms are not student class attendance books.
- Reuse shared forms, AppTable filter/export panels, permission catalog, calendar,
  notifications, print generation and all three languages; prove Austria isolation.

Research, model decisions, implementation slices and open evidence gaps are in
`../digitalmaktab-country-afghanistan/docs/TAQSIM-AWQAT-RESEARCH.md`.
Timetable implementation has started; the first increment below does not imply
that automatic generation, substitution or printing has shipped.


## Timetable implementation increment 1 (2026-10-19)

Audited the live schema read-only as well as models, EF mappings/migrations,
repositories, forms and existing templates. Details and reuse decisions are in
`../digitalmaktab-country-afghanistan/docs/TIMETABLE-MODEL-AUDIT.md`.

- Reuse Class.Shift and existing class/subject/course/teacher/schedule identities.
  Bell values live in existing SchoolAcademicYear.PlanJson, edited through the
  shared year settings form and existing Afghan year endpoint/version guard.
  No new table, column, migration or replacement identity was introduced.
- Bell rules cover grade ranges, shifts, weekdays, variable period counts/durations
  and breaks. Real clock overlap prevents teacher/class double bookings across
  different shift ordinals; unknown mixed-shift clocks require configuration.
- Existing schedule create/update, class shift/grade edits, course moves/primary
  teacher edits and bell changes use shared validation. School advisory locking
  prevents racing writes. Rejected edits roll back. Inactive/foreign records and
  cross-year course moves are rejected.
- Fixed first-grade/section/shift zero-enum validation and the schedule teacher
  input name. Existing period 9/10 assignments now reach the weekly DTO and views.
- Core, country and mobile translations are in English, Dari and Pashto. All new
  controls use existing Core form primitives; no alternative table/filter UI.

Verification: 99 Core PostgreSQL/unit tests and 101 Afghanistan tests pass with
zero skipped. New form test covers eight 40-minute periods, payload round-trip,
midnight, overlaps, weekdays and period 9/10 display in all three languages.
Existing Afghan academic-year editor tests pass. Real Chrome passes Dari dark
1280px/320px, Pashto dark 360px and English light 1280px; the bell shift selector
stays open during Formik validation and time controls fit. TypeScript, i18n/mobile
coverage and local commit hooks are checked before recording this increment.
`sync-all.sh` installs shared packages; mobile country locales rebuilt and swapped
into both existing consumers. User-owned servers are not restarted.

Pending: approved Afghan grade curricula/weekly requirements using existing
Subject/Book/Course and Afghan year policy; automatic draft generation/publication;
missing teacher eligibility/availability; leave-linked per-lesson cover proposals;
dated teacher lesson evidence/taraqi; verified on-demand taraqi and monthly class
attendance PDFs. Original automation work streams 3–5 also remain pending.


Local commits for timetable increment 1 (nothing pushed): Core `faa14c6`,
Afghan backend/audit `db58ed3`, SPA Core `19d75a3`, SPA shell `c6e221aa`,
Afghan SPA `040e5ce`, Afghan mobile `77ae3f5`.

## Timetable implementation increment 2 (2026-10-20)

- Afghan year PolicyJson now stores reviewed grade/Subject references, approved
  weekly periods, maximum periods per day and an approval/source reference. An
  optional existing Book reference selects a grade edition; otherwise the
  subject's primary book remains the default. School/global book ownership and
  active references are checked. No duplicate subject, book, course, shift or year
  table was introduced, and no Ministry book listing was treated as a quota.
- A shared Core generator fills missing periods around fixed Schedule rows using
  existing Course teacher assignments and the shared real-clock validator. It
  spreads lessons across days, supports repeated subjects and different shift/
  grade bell patterns, and reports course, class and teacher capacity shortages.
  Search is bounded to 100,000 nodes/five seconds and 2,000 new lessons; a search
  limit is explicitly inconclusive. Existing courses express teacher assignments;
  the generator never declares an unassigned teacher qualified.
- Shared AppTimetablePlanner uses AppTable filters/exports and an AppModal publish
  confirmation. Afghan year rows/editors link to
  `/afghanistan/academic-years/:id/timetable`. Preview does not write. Publication
  adds validated Schedule rows atomically and preserves every existing lesson.
  School locking spans country-policy resolution and Core publication; a state
  fingerprint invalidates stale drafts and prevents duplicate concurrent inserts.
- Curriculum requires exactly one existing course/teacher assignment for every
  adopted subject in every active class. Incomplete assignments, closed years,
  invalid/foreign/inactive references and stale reviews fail explicitly.
- Weekly timetable formatting retains parallel classes in a period instead of
  silently discarding all but the first. ClassType is the existing morning/
  evening/local/etc. category, not a separate section identifier; the new review
  shows its actual localized meaning. Existing shift/grade identities are retained.

Verification: 102 Core tests and 103 Afghanistan tests pass against isolated
PostgreSQL, with zero skipped. These cover deterministic generation, repeats,
fixed lessons, cross-shift clocks, capacity diagnostics, cancellation/limits,
read-only previews, atomic rejection, concurrent publication, country policy
changes, grade-book persistence, HTTP validation/permissions and Austria isolation.
Shared planner tests pass in English/Dari/Pashto, including guarded single-flight
confirmation and exact version payloads. Existing year editor tests now verify
that grade-subject/book/load references survive unrelated edits. Real Chrome
shared select/bell/Hijri checks pass in Dari dark desktop/320px, Pashto dark 360px
and English light desktop. Package builds/sync, TypeScript and locale checks are
recorded with the local commits. User-owned servers are not restarted.

Still pending: Ministry catalogue adoption/import assistance beyond selecting
existing library records; teacher eligibility/availability/load metadata; reviewed
per-lesson leave cover; dated lesson delivery and attendance evidence; immutable
published history; on-demand taraqi and monthly class attendance book PDFs.
The current official book templates remain unverified. Original automation work
streams 3–5 also remain pending. This increment does not complete the full goal.

Local commits for increment 2 (nothing pushed): Core `05e7cb9`, Afghan backend
`ba66cc9`, SPA Core `1596661`, Afghan SPA `7c330b3`, Afghan mobile `1268297`.
`sync-all.sh` and final `sync-spa.sh` completed; mobile country package rebuilt
and swapped into both existing mobile consumers. Shell TypeScript, strict locale
coverage, diff checks and all local commit hooks pass.


## Timetable implementation completion (2026-10-20)

This entry supersedes the pending timetable items in the earlier increments.
The shared and Afghan workflows now include:

- Existing year PlanJson stores teacher eligibility, generalist grade bounds,
  availability windows and daily/weekly limits. Existing courses retain primary
  assignments; the generator never silently declares an unassigned teacher
  qualified. Shared manual/generation/publication paths enforce the same rules.
- Existing TeacherLeave owns reviewed per-lesson covers. Requests prepare
  candidates/proposals; approval rechecks real clock conflicts, qualifications,
  availability, other leave and combined loads under the school lock. Explicit
  uncovered lessons remain visible. Approved plans can be reviewed again;
  delivered lessons are locked. Assigned/withdrawn covers notify teachers and
  school owners receive request/cancellation/digest alerts.
- `/teaching-lessons` (also `/teacher-attendance`) records the authenticated
  assigned teacher or approved substitute taking explicit class attendance.
  No student mark defaults to present. Dated evidence preserves actual actor,
  original assignment, topic, per-student marks and correction history. Existing
  daily attendance remains independently preserved. Future/closed-year records,
  foreign rosters, forged actors, stale changes and altered retries are rejected.
- TimetablePublication is append-only; school-local effective snapshots preserve
  year/weekly lesson history. New publications do not backdate newly scheduled
  lessons. Delivered evidence survives later timetable edits. Only two genuinely
  missing tables were added, with two additive TeacherLeave columns; a migration
  test applies/removes exactly those additions while retaining legacy data.
- `/afghanistan/curriculum-catalogue` exposes the checked-in 572 Ministry link
  occurrences. School adoption reuses existing Subject/Book identities, stores
  grade editions/additional resources in country PolicyJson, and requires explicit
  quotas/source approval. Guides/readers do not become compulsory subjects.
  School-owned catalogue subjects/books remain private; resource downloads link
  to the official HTTPS source without fetching/copying textbooks on the server.
- `/afghanistan/teaching-registers` offers on-demand taraqi and Solar Hijri monthly
  class attendance books. Native leap/month boundaries, school timezone, teaching
  days, enrollment/withdrawal dates and missing/conflicting records are explicit.
  PDFs use shared Unicode/bidi, filtered rows/selected columns, account print
  preferences, generation cancellation and the completed-artifact viewer. Country
  year policy configures paper, rows, binding margins and a template reference.
  Blank signature lines never synthesize handwriting or evidence.
- All screens reuse Core tables/forms/filter panels/modals; country endpoints and
  menus are isolated from Austria. English, Dari, Pashto and mobile bundles are
  updated. School rules and dated evidence stay in Core; Ministry catalogue,
  native books and print profiles stay in Afghanistan.

The current official Ministry master attendance/taraqi sheet remains unverified.
The implemented exports are explicitly configurable school layouts, not a claim
of exact official-template parity. Ministry book links do not establish current
compulsory subjects or national teaching quotas. The school must approve those.

Verification: 106 Core and 103 Afghanistan tests pass against isolated PostgreSQL
with zero skipped; coverage includes narrow migration up/down, HTTP roles/tenant
boundaries, actual teacher/cover evidence, replay/corrections, immutable history,
catalogue adoption and native-month registers. Shared lesson/cover forms, planner
and year editors pass in all three languages. Real Chrome checks cover Dari dark
320px/desktop, Pashto dark 360px and English light desktop; long shared modals
keep footer actions visible down to 320x480 and 800x240. Actual Unicode A3 register
PDFs pass in all three languages with 31-day grids, multipage taraqi, cancellation
and structured values; a Dari monthly page was visually inspected. The full
shared PDF audit, strict translations and consumer TypeScript builds are checked
before local commits. `sync-all.sh` repacks/installs backend/SPA packages; mobile
country assets are rebuilt and swapped into both consumers. User-owned servers
are untouched; restart API and SPA to load the installed packages. Nothing pushed.

Original automation work streams 3–5 are separate from this timetable request and
remain tracked above; this entry does not mark that broader historic goal complete.

Final local commits (nothing pushed): Core `0c0baf9`, Afghan backend `29242d8`,
SPA Core `84a0313`, Afghan SPA `56e108b`, shell `e36985f8`, mobile `72fcc6f`.
The final PDF audit includes actual country catalogue/register UI checks in all
three languages: version reuse after adoption, validation/single-flight submits,
draft/Apply scopes, school A3 defaults and completed artifacts without refetch.
All 104 table sites pass the shared PDF/filter audit. Commit hooks pass backend,
package/shell TypeScript, locale parity, module isolation and Core UI reuse.
