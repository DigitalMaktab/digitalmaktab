# Automation work plan

Goal: identify and implement useful process automation across the app, using the
shared Core and country/school extension boundaries. Human decisions remain with
users: no inferred attendance, grade decisions, payment confirmation, admissions
approval, promotion, or reporter acceptance of support tickets.

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
2. **Daily completion and decision queues — pending.** Missing attendance and
   marks reminders using confirmed teaching days; overdue approval/task queues
   with direct links. Verify holidays, terms, exceptions and current enrollment.
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

Work streams 2–5 remain pending; the full goal remains active.

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
